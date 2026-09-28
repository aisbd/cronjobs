const { createClient } = require('@clickhouse/client');

const clickhouse = createClient({
  url: 'http://10.10.0.10:8123',

    username: 'default',
    password: 'nevergonnagetit',

  debug: true,
  isUseGzip: true,
  raw: false,
  config: {
    session_timeout: 60,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 1,
  },
});

module.exports = clickhouse;
