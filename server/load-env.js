// Load environment variables before anything else
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });
