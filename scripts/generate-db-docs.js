import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Ensure you have these in your .env file
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
    console.error('❌ Missing SUPABASE_URL or VITE_SUPABASE_URL in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateDocs() {
    console.log('🚀 Connecting to Supabase to fetch schema metadata...');

    const { data: schemaData, error } = await supabase.rpc('get_db_metadata');

    if (error) {
        console.error('❌ Error calling RPC:', error.message);
        return;
    }

    if (!schemaData || schemaData.length === 0) {
        console.error('⚠️ No metadata found. Ensure you ran the SQL helper in Supabase.');
        return;
    }

    let markdown = '# 🗃️ Database Schema Documentation\n\n';
    markdown += `*Last Updated: ${new Date().toLocaleString()}*\n\n`;
    markdown += `This document is auto-generated. To update descriptions, use \`COMMENT ON\` in SQL.\n\n---\n`;

    // Group data by table name
    const tables = [...new Set(schemaData.map(d => d.table_name))];

    tables.forEach(tableName => {
        const tableRows = schemaData.filter(d => d.table_name === tableName);
        const tableDesc = tableRows[0].table_description || 'No table description provided.';

        markdown += `## 📋 Table: \`${tableName}\`\n`;
        markdown += `> ${tableDesc}\n\n`;
        markdown += `| Column | Type | Constraints / Refs | Description |\n`;
        markdown += `| :--- | :--- | :--- | :--- |\n`;

        tableRows.forEach(row => {
            // Combine constraints for a cleaner table
            const constraints = [
                row.is_nullable === 'NO' ? '**NOT NULL**' : null,
                row.foreign_key_ref ? `🔗 ${row.foreign_key_ref}` : null,
                row.check_constraint ? `⚖️ ${row.check_constraint}` : null,
                row.column_default ? `Default: \`${row.column_default}\`` : null
            ].filter(Boolean).join('<br>');

            markdown += `| **${row.column_name}** | \`${row.data_type}\` | ${constraints || '-'} | ${row.column_description || '-'} |\n`;
        });

        markdown += '\n---\n';
    });

    // Ensure docs directory exists
    const docsDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir);

    fs.writeFileSync(path.join(docsDir, 'DATABASE_SCHEMA.md'), markdown);
    console.log('✅ Documentation successfully generated at ./docs/DATABASE_SCHEMA.md');
}

generateDocs();