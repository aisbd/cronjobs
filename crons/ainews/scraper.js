const axios = require("axios");
const cheerio = require("cheerio");
const mysql = require("mysql2/promise");        
const dayjs = require("dayjs");
const { QueryTypes } = require("sequelize");

var db = require('../../Sequelize');


// ------------------ CONFIG ------------------
const MAX_NEWS = 20; // How many latest headlines to fetch
const SOURCE_NAME = "The Business Standard";
const SOURCE_URL = "https://www.tbsnews.net/latest";

// ------------------ UTILS ------------------


// ------------------ SOURCES CONFIG ------------------
const sources = [
    {
        name: "The Business Standard",
        url: "https://www.tbsnews.net/latest",
        parser: async function(html) {
            const $ = cheerio.load(html);
            const articles = [];
            $(".card-section").slice(0, MAX_NEWS).each((_, el) => {
                const title = $(el).find("h3 a").text().trim();
                const relativeLink = $(el).find("h3 a").attr("href");
                const fullLink = relativeLink?.startsWith("http")
                    ? relativeLink
                    : `https://www.tbsnews.net${relativeLink}`;
                if (title && fullLink) {
                    articles.push({
                        title,
                        url: fullLink,
                        source: "The Business Standard",
                        published_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    });
                }
            });
            return articles;
        },
        getContent: async function(url) {
            try {
                const { data } = await axios.get(url);
                const $ = cheerio.load(data);
                let content = [];
                $("article").each((_, el) => {
                    const para = $(el).text().trim();
                    content = para;
                });
                console.log(content);
                return content;
            } catch (err) {
                console.error(`❌ Error fetching full content: ${url}`, err.message);
                return "";
            }
        }
    },
    // Add more sources here
];

// ------------------ SCRAPE ALL SOURCES ------------------
async function scrapeAllSources() {
    try {
        const [recentRows] = await db.query(
            "SELECT url FROM news_articles ORDER BY created_at DESC LIMIT 100"
        );
        const recentUrls = new Set(recentRows.map(a => a.url));

        for (const source of sources) {
            console.log(`🔍 Scraping: ${source.name}`);
            const { data } = await axios.get(source.url);
            const articles = await source.parser(data);

            for (const article of articles) {
                if (recentUrls.has(article.url)) {
                    console.log(`🟡 Already exists: ${article.title}`);
                    continue;
                }

                const content = await source.getContent(article.url);
                if (!content || content.length < 200) {
                    console.log(`❌ Skipped (too short): ${article.title}`);
                    continue;
                }

                await db.query(
                    `INSERT INTO news_articles (title, url, content, source, published_at, created_at)
                     VALUES (?, ?, ?, ?, ?, NOW())`,
                    {
                        replacements: [
                            article.title,
                            article.url,
                            content,
                            article.source,
                            article.published_at,
                        ],
                        type: QueryTypes.INSERT,
                    }
                );

                console.log(`✅ Saved: ${article.title}`);
            }
        }
    } catch (err) {
        console.error("❌ Scraping failed:", err.message);
    } finally {
        console.log('exiting process');
        process.exit(0);
    }
}

// ------------------ RUN ------------------
scrapeAllSources();