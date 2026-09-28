const sequelize = require('../Sequelize');
const clickhouse = require('../ClickHouse');
const axios = require('axios');

async function updateInstrumentsTable() {
    try {
        await updateStocks(); 
        await updateIndices();
        await updateSectors();
        console.log('Instruments table updated successfully.');
    } catch (error) {
        console.error('Error updating instruments table:', error);
    }
}

async function updateStocks() {
  const query = `UPDATE copy_instruments AS i
                    JOIN MKISTAT AS m
                        ON i.code = m.MKISTAT_INSTRUMENT_CODE
                    SET 
                      -- category: first letter of MKISTAT_QUOTE_BASES
                      i.category = LEFT(m.MKISTAT_QUOTE_BASES, 1),
                      
                      -- spot: 1 if MKISTAT_SPOT_TOTAL_TRADES > 0, else 0
                      i.spot = CASE WHEN m.MKISTAT_SPOT_TOTAL_TRADES > 0 THEN 1 ELSE 0 END,

                      -- nv: if same day, difference; if different day, whole volume
                      i.nv = IF(
                              DATE(i.updated_at) = DATE(STR_TO_DATE(m.MKISTAT_LM_DATE_TIME, '%Y-%m-%d %H:%i:%s')),
                              m.MKISTAT_TOTAL_VOLUME - i.volume,
                              m.MKISTAT_TOTAL_VOLUME
                            ),
                      
                      -- new_value: if same day, difference; if different day, whole value
                      i.new_value = IF(
                                      DATE(i.updated_at) = DATE(STR_TO_DATE(m.MKISTAT_LM_DATE_TIME, '%Y-%m-%d %H:%i:%s')),
                                      m.MKISTAT_TOTAL_VALUE - i.value,
                                      m.MKISTAT_TOTAL_VALUE
                                    ),
                      
                      -- new_trades: if same day, difference; if different day, whole value
                      i.new_trades = IF(
                                      DATE(i.updated_at) = DATE(STR_TO_DATE(m.MKISTAT_LM_DATE_TIME, '%Y-%m-%d %H:%i:%s')),
                                      m.MKISTAT_TOTAL_TRADES - i.value,
                                      m.MKISTAT_TOTAL_TRADES
                                    ),
                      
                      -- price and trade fields:
                      i.open   = m.MKISTAT_OPEN_PRICE,
                      i.high   = m.MKISTAT_HIGH_PRICE,
                      i.low    = m.MKISTAT_LOW_PRICE,
                      i.close  = CASE
                                    WHEN m.MKISTAT_CLOSE_PRICE = 0 THEN
                                      CASE
                                        WHEN m.MKISTAT_PUB_LAST_TRADED_PRICE = 0 THEN m.MKISTAT_SPOT_LAST_TRADED_PRICE
                                        ELSE m.MKISTAT_PUB_LAST_TRADED_PRICE
                                      END
                                    ELSE m.MKISTAT_CLOSE_PRICE
                                 END,
                      i.ycp    = m.MKISTAT_YDAY_CLOSE_PRICE,
                      i.trades = m.MKISTAT_TOTAL_TRADES,
                      
                      -- Overwrite old totals with the new ones from MKISTAT
                      i.volume = m.MKISTAT_TOTAL_VOLUME,
                      i.value  = m.MKISTAT_TOTAL_VALUE,
                      
                      -- Update the timestamp
                      i.updated_at = m.MKISTAT_LM_DATE_TIME
                    WHERE
                      (
                        -- If the dates are different, update unconditionally.
                        DATE(i.updated_at) <> DATE(STR_TO_DATE(m.MKISTAT_LM_DATE_TIME, '%Y-%m-%d %H:%i:%s'))
                        OR
                        (
                          -- If it's the same day, update only if both differences are positive.
                          DATE(i.updated_at) = DATE(STR_TO_DATE(m.MKISTAT_LM_DATE_TIME, '%Y-%m-%d %H:%i:%s'))
                          AND (m.MKISTAT_TOTAL_VOLUME - i.volume) > 0
                          AND (m.MKISTAT_TOTAL_VALUE - i.value) > 0
                        )
                      )
                      -- Also, skip updating if MKISTAT_TOTAL_TRADES is 0 or null,
                      -- and require that MKISTAT_LM_DATE_TIME is newer than i.updated_at.
                      AND m.MKISTAT_TOTAL_TRADES > 0
                      AND STR_TO_DATE(m.MKISTAT_LM_DATE_TIME, '%Y-%m-%d %H:%i:%s') > i.updated_at;
                    `;
    try {
        await sequelize.query(query);
        console.log('Stocks updated successfully.');
    } catch (error) {
        console.error('Error updating stocks:', error);
    }
}

async function updateSectors() {
  const maxDateQuery = `SET @maxDate = (SELECT DATE(MAX(updated_at)) FROM copy_instruments);`;
  const tempTable = `CREATE TEMPORARY TABLE tmp_sector_agg AS
                      SELECT 
                          sl.name AS code,
                          ROUND(AVG(ins.open), 2) AS open,
                          ROUND(AVG(ins.high), 2) AS high,
                          ROUND(AVG(ins.low), 2) AS low,
                          ROUND(AVG(ins.close), 2) AS close,
                          (SELECT e.close 
                          FROM eod e 
                          WHERE e.code = sl.name 
                            AND e.date = (SELECT MAX(date) FROM eod WHERE date < @maxDate)
                          ) AS ycp,
                          ROUND(SUM(IF(@maxDate = DATE(ins.updated_at), ins.volume, 0))) AS volume,
                          ROUND(SUM(IF(@maxDate = DATE(ins.updated_at), ins.trades, 0)), 2) AS trades,
                          ROUND(SUM(IF(@maxDate = DATE(ins.updated_at), ins.value, 0)), 2) AS value,
                          MAX(ins.updated_at) AS updated_at,
                          DATE(MAX(ins.updated_at)) AS agg_date
                      FROM copy_instruments ins
                      JOIN sector_lists sl ON sl.id = ins.sector_id
                      WHERE ins.sector_id NOT IN (23, 24, 22)
                        AND ins.sme != 1
                      GROUP BY ins.sector_id;
                      `;
  const query = ` UPDATE copy_instruments i
                    JOIN tmp_sector_agg agg ON i.code = agg.code
                    SET 
                      i.open       = agg.open,
                      i.high       = agg.high,
                      i.low        = agg.low,
                      i.close      = agg.close,
                      i.ycp        = agg.ycp,
                      i.volume     = agg.volume,
                      i.trades     = agg.trades,
                      i.value      = agg.value,
                      i.nv         = IF(DATE(i.updated_at) = agg.agg_date, agg.volume - i.volume, agg.volume),
                      i.new_value  = IF(DATE(i.updated_at) = agg.agg_date, agg.value - i.value, agg.value),
                      i.updated_at = agg.updated_at;
                    `;
    try {
        await sequelize.query(maxDateQuery);
        await sequelize.query(tempTable);
        await sequelize.query(query);
        console.log('Sectors updated successfully.');
    } catch (error) {
        console.error('Error updating sectors:', error);
    }
}

async function updateIndices() {
  const query = `UPDATE copy_instruments i
                  JOIN (
                    SELECT 
                      derived.IDX_INDEX_ID AS code, 
                      derived.IDX_DATE_TIME AS new_updated_at, 
                      derived.IDX_CAPITAL_VALUE AS price, 
                      derived.IDX_DEVIATION AS chng,  
                      t.TRD_TOTAL_TRADES AS trades, 
                      t.TRD_TOTAL_VOLUME AS volume,
                      t.TRD_TOTAL_VALUE AS value
                    FROM (
                      SELECT * 
                      FROM IDX 
                      WHERE IDX_DEVIATION <> 0.00000 
                      ORDER BY IDX_DATE_TIME DESC 
                      LIMIT 3
                    ) AS derived
                    LEFT JOIN trades t 
                      ON DATE_FORMAT(derived.IDX_DATE_TIME, '%Y-%m-%d %H:%i') = DATE_FORMAT(t.TRD_LM_DATE_TIME, '%Y-%m-%d %H:%i')
                  ) d ON i.code = d.code
                  SET 
                    i.trades       = d.trades,
                    -- Original nv calculation commented out:
                    -- i.nv         = IF(DATE(i.updated_at) = DATE(d.new_updated_at), d.volume - i.volume, d.volume),
                    -- New nv: new_value multiplied by 1,000,000
                    i.nv         = IF(DATE(i.updated_at) = DATE(d.new_updated_at), d.value - i.value, d.value) * 1000000,
                    i.new_value  = IF(DATE(i.updated_at) = DATE(d.new_updated_at), d.value - i.value, d.value),
                    i.new_trades  = IF(DATE(i.updated_at) = DATE(d.new_updated_at), d.trades - i.trades, d.trades),
                    i.volume     = d.volume,
                    i.value      = d.value,
                    i.close      = d.price,
                    i.high       = IF(DATE(i.updated_at) = DATE(d.new_updated_at),
                                      GREATEST(i.high, d.price),
                                      d.price),
                    i.low        = IF(DATE(i.updated_at) = DATE(d.new_updated_at),
                                      LEAST(i.low, d.price),
                                      d.price),
                    i.open       = IF(DATE(i.updated_at) = DATE(d.new_updated_at),
                                      i.open,
                                      i.close),
                    i.ycp        = IF(DATE(i.updated_at) = DATE(d.new_updated_at),
                                      i.ycp,
                                      i.close),
                    i.updated_at = d.new_updated_at;
                  `;
    try {
        await sequelize.query(query);
        console.log('Indices updated successfully.');
    } catch (error) {
        console.error('Error updating indices:', error);
    }
}

async function updateEodTable(data) {
  const mysqlQuery = `INSERT INTO copy_eod 
                        (code, date, open, high, low, close, volume, trade, value)
                        VALUES
                          ${data
                            .map(row => `(
                              '${row.code}',
                              '${row.date}',
                              '${row.open}',
                              '${row.high}',
                              '${row.low}',
                              '${row.close}',
                              '${row.volume}',
                              '${row.trades}',
                             '${row.value}'
                            )`)
                            .join(', ')}
                        ON DUPLICATE KEY UPDATE
                          open        = VALUES(open),
                          high        = VALUES(high),
                          low         = VALUES(low),
                          close       = VALUES(close),
                          volume      = VALUES(volume),
                          trade      = VALUES(trade),
                          value      = VALUES(value)
                      `;

  try {
    await sequelize.query(mysqlQuery);
    console.log('EOD table updated successfully in MySQL.');
  } catch (error) {
    console.error('Error updating EOD table in MySQL:', error);
  }

  try {
    await clickhouse.insert({
      table: 'eod_raw',
      format: 'JSONEachRow',
      values: data.map(row => ({
        code: row.code,
        date: row.date,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        trade: row.trades,
        value: row.value,
        updated_at: row.updated_at
      }))
    })    
    console.log('EOD table updated successfully in ClickHouse.');
  } catch (error) {
    console.error('Error updating EOD table in ClickHouse:', error);
  }
}


async function updateMinuteDataTable(data) {
  const mysqlQuery = `INSERT INTO copy_minute_data
                        (code, price, volume, value, trades, date, created_at)
                      VALUES
                        ${data
                          .map((row) => `(
                            '${row.code}',
                            ${row.close},
                            ${row.nv},
                            ${row.new_value},
                            ${row.new_trades},
                            '${row.date}',
                            '${row.updated_at}'
                          )`)
                          .join(', ')}`;


  try {
    await sequelize.query(mysqlQuery);
    console.log('Minute data table updated successfully in MySQL.');
  } catch (error) {
    console.error('Error updating minute data table in MySQL:', error);
  }

  try {
    await clickhouse.insert({
      table: 'minute_data',
      format: 'JSONEachRow',
      values: data.map(row => ({
        code: row.code,
        date: row.date,
        price: row.close,
        volume: row.nv,
        trades: row.new_trades,
        value: row.new_value,
        created_at: row.updated_at,
        updated_at: row.updated_at
      }))
    })   

    console.log('Minute data table updated successfully in ClickHouse.');
  } catch (error) {
    console.error('Error updating minute data table in ClickHouse:', error);
  }
}

async function getChangedInstrumentsFromTable(lastUpdatedAt) {
    const query = `SELECT code, category, spot, nv, new_value, new_trades, open, high, low, close, ycp, trades, volume, value, updated_at, DATE(updated_at) AS date
                   FROM copy_instruments 
                   WHERE updated_at > '${lastUpdatedAt}'
                   `; // Adjust the interval as needed

    try {
        const [results, metadata] = await sequelize.query(query);
        return results;
    } catch (error) {
        console.error('Error fetching instruments from table:', error);
        return [];
    }
}


async function getLastUpdatedAt() {
  const query = `SELECT MAX(updated_at) AS maxDate FROM copy_instruments`;
  try {
    const [results, metadata] = await sequelize.query(query);
    return results[0].maxDate;
  } catch (error) {
    console.error('Error fetching max updated_at:', error);
    return null;
  }
}

async function broadcastChangedInstruments(changedInstruments) {
  if (changedInstruments.length > 0) {
    // Broadcast changed instruments to WebSocket server
    const dataToSend = changedInstruments.reduce((acc, { code, high, low, new_value, nv, open, trades, updated_at, value, volume, ycp }) => {
      acc[code] = { code, high, low, new_value, nv, open, trades, updated_at, value, volume, ycp };
      return acc;
    }, {});

    try {
      await axios.post("https://ws.stocknow.com.bd/storeUpdate", { data: dataToSend });
      console.log('Sent to socket');
    } catch (error) {
      console.error("Error on socket request", error.response);
    }
  }
}
async function UpdateFileData(changedInstruments) {
  if (changedInstruments.length > 0) {
    // Broadcast changed instruments to WebSocket server
    const dataToSend = changedInstruments.reduce((acc, { code, high, low, new_value, nv, open, trades, updated_at, value, volume, ycp }) => {
      acc[code] = { code, high, low, new_value, nv, open, trades, updated_at, value, volume, ycp };
      return acc;
    }, {});

    try {
    const r =  await axios.post("https://vip.stocknow.com.bd/v1/crons/UpdateFileData", { data: dataToSend });
      console.log('sent to file data');
     await axios.post('https://ws.stocknow.com.bd/chartUpdate', { data: r.data })
    } catch (error) {
      console.error("Error on socket request", error.response);
    }
                      
  }
}

async function broadcastTRDtable() {
  const query = `SELECT *
                 FROM TRD
                 LIMIT 1`;  // Get the latest row from TRD table        
    try {
      const [results, metadata] = await sequelize.query(query);   
      const tradeData = results[0];
      try {
      await axios.post("https://ws.stocknow.com.bd/push/trades/TradeUpdate", {data: `${tradeData.TRD_TOTAL_TRADES}|${tradeData.TRD_TOTAL_VOLUME}|${tradeData.TRD_TOTAL_VALUE}`}).then((r)=>{console.log('sent to socket')}).catch((e)=>{console.log("error on socket req", e.response)})
        console.log('Sent to socket');
      } catch (error) {
        console.error("Error on socket request", error.response);
      } 
    } catch (error) {
      console.error('Error fetching TRD table:', error);
    }
}

(async () => {
  console.time('Time');

  // first keep the last updated_at from the table
  const lastUpdatedAt = await getLastUpdatedAt();

  // update the instruments table
  await updateInstrumentsTable();

  // after successfully updating instruments table now get changed instruments from the table
  const changedInstruments = await getChangedInstrumentsFromTable(lastUpdatedAt);
  // console.log(lastUpdatedAt)
  if (changedInstruments.length > 0) {

    await updateEodTable(changedInstruments);
    await updateMinuteDataTable(changedInstruments);

    // broadcast changed instruments to WebSocket server for real-time updates
    await broadcastChangedInstruments(changedInstruments);
    // await broadcastChangedInstruments(UpdateFileData);
    await broadcastTRDtable();

  }
  // close connections 
  sequelize.close();
  console.log(`updated ${changedInstruments.length} items`);
  console.log('Closing Connections');
  console.timeEnd('Time');

})();