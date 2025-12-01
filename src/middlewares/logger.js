const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    const logMessage = `${new Date().toISOString()} - ${method} ${originalUrl} - IP: ${ip} - Status: ${statusCode} - ${duration}ms`;
    
    if (statusCode >= 500) {
      console.error(logMessage);
    } else if (statusCode >= 400) {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  });
  
  next();
};

module.exports = loggerMiddleware;