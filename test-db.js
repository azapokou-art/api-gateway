const { pool, getConfig } = require('./src/config/database');

async function testDatabase() {
  console.log('Testando conexão com PostgreSQL...');
  
  try {
   
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Conexão OK. Hora do banco:', result.rows[0].current_time);
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Tabelas encontradas:');
    tables.rows.forEach(table => {
      console.log('  -', table.table_name);
    });
    
    const rateLimit = await getConfig('rate_limit_default');
    console.log('Config rate_limit_default:', rateLimit);
    
    await pool.query(`
      INSERT INTO blocked_ips (ip_address, reason, is_permanent, created_by)
      VALUES ('192.168.1.100', 'Teste de bloqueio', true, 'test')
      ON CONFLICT (ip_address) DO NOTHING
    `);
    
    const blocked = await pool.query('SELECT * FROM blocked_ips');
    console.log('IPs bloqueados:', blocked.rows.length);
    console.log('Detalhes:', blocked.rows);
    
    const logResult = await pool.query(`
      INSERT INTO access_logs 
      (ip_address, method, path, status_code, response_time, user_agent, service_name)
      VALUES ('127.0.0.1', 'GET', '/test', 200, 150, 'Test-Agent', 'test-service')
      RETURNING id
    `);
    console.log('Log inserido com ID:', logResult.rows[0].id);
    
    const logCount = await pool.query('SELECT COUNT(*) as total FROM access_logs');
    console.log('Total de logs:', logCount.rows[0].total);
    
    console.log('Todos os testes do PostgreSQL passaram!');
    
    await pool.query("DELETE FROM blocked_ips WHERE created_by = 'test'");
    await pool.query("DELETE FROM access_logs WHERE service_name = 'test-service'");
    console.log('Dados de teste removidos.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('Erro no teste do PostgreSQL:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

testDatabase();