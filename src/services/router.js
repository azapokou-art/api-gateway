const axios = require('axios');
const servicesConfig = require('../../services.json');

class DynamicRouter {
  constructor() {
    this.services = servicesConfig.services;
    this.routes = this.buildRoutes();
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
    if (path === '*') {
      return /.*/;
    }
    
    let regexPath = path
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, '([^\\/]+)')
      .replace(/\*/g, '.*');
    
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
  
  async proxyRequest(req, res, route) {
    const targetUrl = route.baseUrl + req.originalUrl;
    
    console.log(`Proxy (axios): ${req.method} ${req.originalUrl} -> ${targetUrl}`);
    
    try {
      const config = {
        method: req.method,
        url: targetUrl,
        headers: {
          ...req.headers,
          'x-forwarded-for': req.ip,
          'x-forwarded-host': req.get('host'),
          'x-service-target': route.serviceName,
          host: new URL(route.baseUrl).host
        },
        data: req.body,
        timeout: 5000,
        validateStatus: null
      };
      
      delete config.headers['connection'];
      
      const response = await axios(config);
      
      res.status(response.status)
         .set(response.headers)
         .send(response.data);
         
    } catch (error) {
      console.error('Proxy axios error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        res.status(502).json({
          error: 'Bad Gateway',
          message: `Serviço ${route.serviceName} não está respondendo`,
          details: `Não foi possível conectar em ${route.baseUrl}`
        });
      } else if (error.code === 'ETIMEDOUT') {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: `Serviço ${route.serviceName} não respondeu a tempo`
        });
      } else {
        res.status(500).json({
          error: 'Proxy Error',
          message: 'Erro ao processar a requisição',
          details: error.message
        });
      }
    }
  }
  
  getMiddleware() {
    return (req, res, next) => {
      console.log(`[ROUTER] Buscando rota para: ${req.method} ${req.originalUrl}`);
      
      const route = this.findRoute(req);
      
      if (!route) {
        console.log(`[ROUTER] Rota NÃO encontrada para: ${req.originalUrl}`);
        return next();
      }
      
      console.log(`[ROUTER] Rota encontrada: ${route.serviceName} ${route.path}`);
      console.log(`[ROUTER] Proxy para: ${route.baseUrl}`);
      
      req.matchedRoute = route;
      
      next();
    };
  }
}

module.exports = new DynamicRouter();