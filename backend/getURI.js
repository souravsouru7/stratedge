const fs = require('fs');
const dns = require('dns');
dns.setServers(['8.8.8.8']);
dns.resolveTxt('cluster0.2jpuldb.mongodb.net', (e, t) => {
  if (e) return console.error(e);
  const a = t[0].join('');
  dns.resolveSrv('_mongodb._tcp.cluster0.2jpuldb.mongodb.net', (e, s) => {
    if (e) return console.error(e);
    const h = s.map(x => x.name + ':' + x.port).join(',');
    fs.writeFileSync('uri_output.txt', 'mongodb://s6165544_db_user:5Z8jC5dx6ZSgJEeh@'+h+'/trading_db?'+a+'&retryWrites=true&w=majority&appName=Cluster0');
  });
});
