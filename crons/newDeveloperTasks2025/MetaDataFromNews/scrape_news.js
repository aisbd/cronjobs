const { sequelize, Fundamentals, News } = require('./database');
const { Op } = require('sequelize');
const OpenAI = require('openai');
require("dotenv").config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY;
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});
let addedCount = 0;
let skippedCount = 0;
        

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    let count = 1; // default value
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n' && i + 1 < args.length) {
            count = parseInt(args[i + 1]);
            if (isNaN(count) || count <= 0) {
                console.error('Error: -n parameter must be a positive number');
                console.error('Use -h for help');
                process.exit(1);
            }
            break;
        }
    }
    
    return count;
}

const count = parseArgs();
// Function to check if news is continuation
function isContinuationNews(news_content) {
    const continuationPatterns = [
        /^\(Cont\.\s+news\s+of\s+/i,
        /^\(Continuation\s+news\s+of\s+/i,
        /^\(Continuation\s+of\s+/i,
        /^\(Cont\.\s+of\s+/i,
        /^\(cont\.\s+news\s+of\s+/i,
        /^\(cont\.\s+/i
    ];
    
    return continuationPatterns.some(pattern => pattern.test(news_content.trim()));
}

//  Process complete news using AI
async function processCompleteNews(prefix, details, post_date) {
    try {
        console.log(`\nProcessing complete news with AI for code: ${prefix}`);
        console.log("==================================");
        // Generate properties using AI
        const properties = await generatePropertiesWithAI(details);
        
        if (properties && Object.keys(properties).length > 0) {
            console.log(`✅ AI successfully extracted ${Object.keys(properties).length} properties`);
            await addToFundamentalsTable(prefix, properties, post_date);
        } else {
            console.log('⚠️  No properties extracted by AI - news may not contain financial data');
        }
        
    } catch (error) {
        console.error('❌ Error processing complete news:', error);
        throw error;
    }
}

// Function to generate properties using AI
async function generatePropertiesWithAI(news_content) {
    try {

        const systemPrompt = `You are an AI assistant specialized in financial data extraction. Your task is to analyze the provided text and extract the values for the following financial metrics. Format your response as a single JSON object. The keys of the JSON object must be exactly as specified in the list below. If a value for a specific metric cannot be found in the text do not return the metric. Do not add any explanations or text outside of the JSON object.
 - net_asset_val_per_share (Net Asset Value per Share)
 - q1_eps_cont_op (Quarter 1 Earnings Per Share from Continuing Operations)
 - q2_eps_cont_op (Quarter 2 Earnings Per Share from Continuing Operations)
 - q3_eps_cont_op (Quarter 3 Earnings Per Share from Continuing Operations)
 - earning_per_share (Earnings Per Share)
 - cash_dividend (Cash Dividend in PERCENTAGE)
 - stock_dividend (Stock Dividend)
 - half_year_eps_cont_op (Half-Year Earnings Per Share from Continuing Operations)
 - q3_nine_month_eps (Nine-Month Earnings Per Share for Q3)
 - paid_up_capital (Paid-Up Capital)
 - authorized_capital (Authorized Capital)
 - q1_nocf_per_share (Quarter 1 Net Operating Cash Flow Per Share)
 - half_year_nocf_per_share (Half-Year Net Operating Cash Flow Per Share)
 - q1_nine_month_nocf_per_share (Nine-Month Net Operating Cash Flow Per Share)
 - nocf_per_share (Net Operating Cash Flow Per Share)
 - face_value_per_unit (Face Value per Unit)
 - net_asset_current_market_price (Net Asset Value at Current Market Price)`;

//  - net_asset_cost_price (Net Asset Value at Cost Price)
//  - last_agm_held (Last Annual General Meeting Held)
        const userContent = `${news_content}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user", 
                    content: userContent
                }
            ],
            temperature: 0.0,
            max_tokens: 1500,
            response_format: { type: "json_object" }
        });

        
        const aiResponse = response.choices[0].message.content.trim();
        
        console.log('\n🤖 AI PROCESSING RESULTS:');
        console.log('=' * 50);
        console.log('📰 News Content:');
        console.log(news_content);
        console.log('\n🔍 AI Response:');
        console.log(aiResponse);
        
        // Parse JSON response
        try {
            const parsedResponse = JSON.parse(aiResponse);
            
            console.log('\n📊 Extracted Financial Metrics:');
            console.log('================================');
            if (Object.keys(parsedResponse).length === 0) {
                console.log('⚠️  No financial metrics extracted');
            } else {
                Object.entries(parsedResponse).forEach(([key, value]) => {
                    console.log(`${key}: ${value}`);
                });
            }
            console.log('================================\n');
            
            return parsedResponse;
        } catch (parseError) {
            throw parseError;
            console.error('❌ Failed to parse AI response as JSON:', parseError);
            console.error('Raw response:', aiResponse);
            return {};
        }
        
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}

//  Add new rows to fundamentals table
async function addToFundamentalsTable(prefix, properties, post_date) {
    try {
        console.log(`\n📊 Processing extracted data for code: ${prefix}`);
        console.log(`📅 Post date: ${post_date}`);
        console.log(`🔢 Number of properties extracted: ${Object.keys(properties).length}`);
        
        
        for (const [key, value] of Object.entries(properties)) {
            if (value === null || value === undefined || value === '') {
                console.log(`⚪ Skipping empty value for: ${key}`);
                continue; // Skip empty values
            }
            
            console.log(`\n🔍 Processing: ${key} = ${value}`);

            
            
            var fundaData =  {meta_key: key, code: prefix, meta_date: post_date, meta_value: value};
            await insertFundamentalMeta(fundaData);
            
        }
        
        console.log(`\n📈 Summary for ${prefix}:`);
        console.log(`   ✅ Added: ${addedCount} fundamentals`);
        console.log(`   🔄 Skipped: ${skippedCount} duplicates`);
        console.log(`   ⚪ Empty: ${Object.keys(properties).length - addedCount - skippedCount} empty values`);
        
    } catch (error) {
        console.error('❌ Error adding to fundamentals table:', error);
        throw error;
    }
}

async function insertFundamentalMeta(fundaData){
    // Step 10: Check if new data differs from old data
    const shouldUpdate = await checkIfDataDiffers(fundaData.code, fundaData.meta_key, fundaData.meta_value, fundaData.meta_date);
    if (shouldUpdate) {
        // Step 9: Update previous latest row to is_latest = 0
        await updatePreviousLatestRows(fundaData.code, fundaData.meta_key);

        // Insert new row
        await insertNewFundamentalRow(fundaData.code, fundaData.meta_key, fundaData.meta_value, fundaData.meta_date);

        console.log(`✅ Added new fundamental: ${fundaData.meta_key} = ${fundaData.meta_value} for code: ${fundaData.code}`);
        addedCount++;
    } else {
        console.log(`🔄 Skipped duplicate fundamental: ${fundaData.meta_key} for code: ${fundaData.code}`);
        skippedCount++;
    }
}

// Check if new data differs from existing data
async function checkIfDataDiffers(code, meta_key, meta_value, post_date) {
    try {
        /*
        TODO : and also check if the latest meta_date is less than the incoming post_date
        */
        const existingData = await Fundamentals.findOne({
            where: {
                code: code,
                meta_key: meta_key,
                is_latest: 1
            },
            order: [['created_at', 'DESC']]
        });
        
        if (!existingData) {
            return true; // No existing data, so it's new
        }
        
        const existingValue = existingData.meta_value;
        const existingDate = new Date(existingData.meta_date);
        const newDate = new Date(post_date);
        
        return existingDate < newDate && existingValue !== String(meta_value);
        
    } catch (error) {
        console.error('Error checking data differences:', error);
        return true; // Default to updating on error
    }
}

//  Update previous latest rows to is_latest = 0
async function updatePreviousLatestRows(prefix, meta_key) {
    try {
        await Fundamentals.update(
            { is_latest: 0 },
            {
                where: {
                    code: prefix,
                    meta_key: meta_key,
                    is_latest: 1
                }
            }
        );
    } catch (error) {
        console.error('Error updating previous latest rows:', error);
        throw error;
    }
}

// Insert new fundamental row
async function insertNewFundamentalRow(prefix, meta_key, meta_value, post_date) {
    try {
        await Fundamentals.create({
            code: prefix,
            meta_key: meta_key,
            meta_value: String(meta_value),
            meta_date: new Date(post_date),
            is_latest: 1
        });
    } catch (error) {
        console.error('Error inserting new fundamental row:', error);
        throw error;
    }
}

// Check if full news contains financial keywords (case-insensitive using regex)
function containsFinancialKeywords(newsContent) {
    // Simplified regex pattern with common keywords that cover all variations
    const pattern = /\bNAV\b|net asset value|book value per share|asset backing|\bEPS\b|earnings per share|profit per share|dividend|bonus shares|bonus issue|paid-up capital|share capital|equity capital|authorized capital|AGM|annual general meeting|shareholders' meeting|\bNOCF\b|operating cash flow|cash flow per share|face value|par value|nominal value/i;
    return pattern.test(newsContent);
}

async function main() {
    
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        console.log(`📊 Will process up to ${count} complete news item(s)`);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        return;
    }
    
    let processedCompleteNewsCount = 0;
    
    // Loop until we process the desired number of complete news items
    while (processedCompleteNewsCount < count) {
        // Get first 8 rows from database with serial_no
        const newsItems = await News.findAll({
            attributes: ['id', 'prefix', 'title', 'details', 'post_date'],
            where: {
                trash: 0,
                processed: 0, // Only get unprocessed news
            },
            order: [['id', 'ASC']], // Changed to ASC to get sequential news
            limit: 8 // Get first 8 rows
        });

        if (newsItems.length === 0) {
            console.log('No more unprocessed news items found.');
            break;
        }

        // Add serial_no to each item
        const newsWithSerialNo = newsItems.map((item, index) => ({
            ...item.toJSON(),
            serial_no: index + 1
        }));

        console.log(`\n📋 Retrieved ${newsWithSerialNo.length} news items with serial numbers`);
        newsWithSerialNo.forEach(item => {
            console.log(`Serial #${item.serial_no}: ID ${item.id} - ${item.prefix}`);
        });

        // Start processing from the first news
        const firstNews = newsWithSerialNo[0];
        console.log(`\n🔍 Processing Complete News #${processedCompleteNewsCount + 1} of ${count}`);
        console.log(`Starting with Serial #${firstNews.serial_no} (ID: ${firstNews.id})`);

        try {
            const { id, prefix, title, details, post_date } = firstNews;
            
            // Collect all continuation news starting from the first one
            let rows = [];
            let currentIndex = 0;
            
            // Check if first news is continuation (shouldn't be, but check anyway)
            const isContinuation = isContinuationNews(details);
            if (isContinuation) {
                console.log('⚠️  First news is a continuation - this is unexpected');
            }
            
            // Add first news
            rows.push(newsWithSerialNo[currentIndex]);
            console.log(`✅ Added Serial #${newsWithSerialNo[currentIndex].serial_no} to full news`);
            
            // Check for continuation and collect next news
            while (currentIndex < newsWithSerialNo.length - 1) {
                const currentNews = newsWithSerialNo[currentIndex];
                const hasMoreContent = currentNews.details.trim().endsWith('(cont.)');
                
                if (hasMoreContent) {
                    currentIndex++;
                    rows.push(newsWithSerialNo[currentIndex]);
                    console.log(`✅ Added continuation Serial #${newsWithSerialNo[currentIndex].serial_no} to full news`);
                } else {
                    break;
                }
            }
            
            console.log(`\n📰 Complete news collected from ${rows.length} news item(s)`);
            
            // Combine full news content
            let fullNewsContent = rows.map(r => r.details).join(' ');
            
            // Check if full news contains financial keywords (case-sensitive)
            const hasFinancialKeywords = containsFinancialKeywords(fullNewsContent);
            
            if (hasFinancialKeywords) {
                console.log('✅ Full news contains financial keywords - processing with AI');
                await processCompleteNews(prefix, fullNewsContent, post_date);
            } else {
                console.log('⏭️  News:');
                console.log(fullNewsContent);
                console.log("*".repeat(20));
                console.log('⏭️  Full news does NOT contain financial keywords - skipping AI processing');
            }
            
            // Mark all collected news as processed
            for (const row of rows) {
                await News.update(
                    { processed: 1 },
                    { where: { id: row.id } }
                );
                console.log(`✅ Marked news item ID ${row.id} (Serial #${row.serial_no}) as processed`);
            }
            
            processedCompleteNewsCount++;
            console.log(`\n✅ Completed ${processedCompleteNewsCount} of ${count} news items`);
            
        } catch(err) {
            console.error('Error processing news:', err);
            // Continue to next iteration even if there's an error
        }
    }

    console.log(`\n🎉 Successfully processed ${processedCompleteNewsCount} complete news item(s)`);
    
    // Close database connection
    await sequelize.close();
    console.log('Database connection closed.');
}

main().catch(console.error);
