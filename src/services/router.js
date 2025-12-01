const httpProxy = require('http-proxy');
const servicesConfig = require('../../services.json');

class DynamicRouter {
  constructor() {
    this.proxy = httpProxy.createProxyServer({});
    this.services = servicesConfig.services;
    this.routes = this.buildRoutes();
    
    this.proxy.on('error', (err, req, res) => {
      console.error('Proxy error:', err);
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Bad Gateway',
          message: 'Falha ao conectar com o serviço de destino'
        });
      }
    });
  }
  
  buildRoutes() {
    const routes = [];
    
    Object.keys(this.services).forEach(serviceName => {
      const service = this.services[serviceName];
      
      service.routes.forEach(routeConfig => {
        const pathRegex = this.convertPathToRegex(routeConfig.path);
        
        routes.push({
          serviceName,
          baseUrl: service.baseUrl,
          path: routeConfig.path,
          pathRegex,
          methods: routeConfig.methods,
          requiresAuth: routeConfig.requiresAuth !== undefined ? routeConfig.requiresAuth : true,
          rateLimit: routeConfig.rateLimit !== undefined ? routeConfig.rateLimit : servicesConfig.global.defaultRateLimit
        });
      });
    });
    
    console.log(`Rotas configuradas: ${routes.length}`);
    return routes;
  }
  
  convertPathToRegex(path) {
    const regexPath = path.replace(/:\w+/g, '([^/]+)');
    return new RegExp(`^${regexPath}$`);
  }
  
  findRoute(req) {
    const { method, path } = req;
    
    for (const route of this.routes) {
      if (route.methods.includes(method) && route.pathRegex.test(path)) {

        const params = this.extractParams(path, route.path);
        req.params = params;
        
        return route;
      }
    }
    
    return null;
  }
  
  extractParams(url, pathTemplate) {
    const params = {};
    const urlParts = url.split('/');
    const templateParts = pathTemplate.split('/');
    
    templateParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1);
        params[paramName] = urlParts[index];
      }
    });
    
    return params;
  }
  
  proxyRequest(req, res, route) {
    const targetUrl = route.baseUrl + req.originalUrl;
    
    console.log(`Proxy: ${req.method} ${req.originalUrl} -> ${targetUrl}`);
    
    const timeout = servicesConfig.global.timeout || 5000;
    
    const proxyOptions = {
      target: route.baseUrl,
      changeOrigin: true,
      timeout: timeout
    };
    
    req.headers['x-forwarded-for'] = req.ip;
    req.headers['x-forwarded-host'] = req.get('host');
    req.headers['x-service-target'] = route.serviceName;
    
    this.proxy.web(req, res, proxyOptions);
  }
  
  getMiddleware() {
    return (req, res, next) => {
      const route = this.findRoute(req);
      
      if (!route) {
        return next();
      }
      
      req.matchedRoute = route;
      
      next();
    };
  }
}

module.exports = new DynamicRouter();