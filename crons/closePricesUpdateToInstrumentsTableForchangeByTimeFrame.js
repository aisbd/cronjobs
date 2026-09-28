var  sequelize  = require('../Sequelize');

async function main(){
    var date = await sequelize.query("select updated_at from instruments where code = 'DSEX'")
   date = date[0][0].updated_at
    var a = await sequelize.query(`
UPDATE instruments i
JOIN (
    SELECT
        code AS stock_code,
        (
            SELECT close
            FROM adjusted_eod
            WHERE code = ea.code
              AND date <= DATE_SUB(DATE('${date}'), INTERVAL 7 DAY)
            ORDER BY date DESC
            LIMIT 1
        ) AS 7d,
        (
            SELECT close
            FROM adjusted_eod
            WHERE code = ea.code
              AND date <= DATE_SUB(DATE('${date}'), INTERVAL 15 DAY)
            ORDER BY date DESC
            LIMIT 1
        ) AS 15d,
        (
            SELECT close
            FROM adjusted_eod
            WHERE code = ea.code
              AND date <= DATE_SUB('${date}', INTERVAL 30 DAY)
            ORDER BY date DESC
            LIMIT 1
        ) AS 30d,
        (
            SELECT close
            FROM adjusted_eod
            WHERE code = ea.code
              AND date <= DATE_SUB('${date}', INTERVAL 90 DAY)
            ORDER BY date DESC
            LIMIT 1
        ) AS 90d,
        (
            SELECT close
            FROM adjusted_eod
            WHERE code = ea.code
              AND date <= DATE_SUB('${date}', INTERVAL 180 DAY)
            ORDER BY date DESC
            LIMIT 1
        ) AS 180d,
        (
            SELECT close
            FROM adjusted_eod
            WHERE code = ea.code
              AND date <= DATE_SUB('${date}', INTERVAL 365 DAY)
            ORDER BY date DESC
            LIMIT 1
        ) AS 365d
    FROM
        adjusted_eod ea
    GROUP BY
        code
) AS subquery ON i.code = subquery.stock_code
SET
    i.7d = subquery.7d,
    i.15d = subquery.15d,
    i.30d = subquery.30d,
    i.90d = subquery.90d,
    i.180d = subquery.180d,
    i.365d = subquery.365d;

        `)


    console.log(a)
}
main()
