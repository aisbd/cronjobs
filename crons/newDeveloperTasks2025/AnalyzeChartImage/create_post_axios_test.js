/**
 * WordPress Post Creation Script
 * * Requirements: Node.js v18+
 * * Dependencies: axios (run `npm install axios`)
 * Usage: Update the CONFIG object below and run `node create_post.js`
 */

const axios = require("axios"); // Requirement: npm install axios
require("dotenv").config();


username=process.env.username
password=process.env.pass

// --- CONFIGURATION ---
const CONFIG = {
    // Your WordPress Site URL (no trailing slash)
    url: 'https://blog.stocknow.com.bd', 
    
    // WordPress Username
    username,
    
    // Application Password (NOT your login password)
    // Generate at: WP Admin -> Users -> Profile -> Application Passwords
    password,
};

/**
 * Creates a new post on WordPress via REST API
 * * Reference: https://developer.wordpress.org/rest-api/reference/posts/#create-a-post
 */
async function createWordPressPost() {
    const endpoint = `${CONFIG.url}/wp-json/wp/v2/posts`;

    // Post Data Object
    // See reference link for all available fields (categories, tags, featured_media, etc.)
    const postData = {
        title: 'Hello World from Node.js (Axios)',
        content: `
            <!-- wp:paragraph -->
            <p>This is a post created programmatically using the <strong>WordPress REST API</strong> and Axios.</p>
            <!-- /wp:paragraph -->
            
            <!-- wp:heading -->
            <h2>Why is this cool?</h2>
            <!-- /wp:heading -->
            
            <!-- wp:list -->
        `,
        status: 'draft', // Options: 'publish', 'draft', 'pending', 'private', 'future'
        // categories: [1, 5], // Optional: Array of Category IDs
        // tags: [10, 12],     // Optional: Array of Tag IDs
        // author: 1,          // Optional: Author ID (defaults to authenticated user)
        // date: '2023-12-25T10:00:00', // Optional: Set specific date
    };

    console.log(`Creating post on ${CONFIG.url}...`);

    try {
        // Axios automatically handles Basic Auth encoding and JSON headers
        const response = await axios.post(endpoint, postData, {
            auth: {
                username: username,
                password: password
            }
        });

        const data = response.data;

        // Success
        console.log('✅ Post created successfully!');
        console.log('-----------------------------------');
        console.log(`ID:     ${data.id}`);
        console.log(`Title:  ${data.title.raw}`);
        console.log(`Status: ${data.status}`);
        console.log(`Link:   ${data.link}`);
        console.log('-----------------------------------');

        return data;

    } catch (error) {
        // Axios encapsulates the response error in error.response
        if (error.response) {
            console.error(`❌ WordPress API Error (${error.response.status}):`, error.response.data);
        } else if (error.request) {
            console.error('❌ No response received:', error.request);
        } else {
            console.error('❌ Error setting up request:', error.message);
        }
    }
}

 async function deleteWordPressPostById(postId) {
    const endpoint = `${CONFIG.url}/wp-json/wp/v2/posts/${postId}?force=true`;

    console.log(`Deleting post ID ${postId} on ${CONFIG.url}...`);

    try {
        // Axios automatically handles Basic Auth encoding and JSON headers
        const response = await axios.delete(endpoint, {
            auth: {
                username: CONFIG.username,
                password: CONFIG.password
            }
        });

        const data = response.data;

        // Success
        console.log('✅ Post deleted successfully!');
        console.log('-----------------------------------');
        console.log(`ID:     ${data.previous.id}`);
        console.log(`Title:  ${data.previous.title.raw}`);
        console.log(`Status: ${data.previous.status}`);
        console.log('-----------------------------------');

        return data;

    } catch (error) {
        // Axios encapsulates the response error in error.response
        if (error.response) {
            console.error(`❌ WordPress API Error (${error.response.status}):`, error.response.data);
        } else if (error.request) {
            console.error('❌ No response received:', error.request);
        } else {
            console.error('❌ Error setting up request:', error.message);
        }
    }
}   

async function getWordPressPostById(postId){
    const endpoint = `${CONFIG.url}/wp-json/wp/v2/posts/${postId}`;

    console.log(`Fetching post ID ${postId} from ${CONFIG.url}...`);

    try {
        // Axios automatically handles Basic Auth encoding and JSON headers
        const response = await axios.get(endpoint, {
            auth: {
                username: CONFIG.username,
                password: CONFIG.password
            }
        });

        const data = response.data;
        console.log('✅ Post fetched successfully!');
        console.log('-----------------------------------');
        console.log(`ID:     ${data.id}`);
        console.log(`Title:  ${data.title.rendered}`);
        console.log(`Content:  ${data.content.rendered}`);
        console.log(`Status: ${data.status}`);
        console.log('-----------------------------------');

    } catch (error) {
        // Axios encapsulates the response error in error.response
        if (error.response) {
            console.error(`❌ WordPress API Error (${error.response.status}):`, error.response.data);
        } else if (error.request) {
            console.error('❌ No response received:', error.request);
        } else {
            console.error('❌ Error setting up request:', error.message);
        }
    }
}
// Execute the function
// createWordPressPost();
// deleteWordPressPostById(8552);

getWordPressPostById(8553);