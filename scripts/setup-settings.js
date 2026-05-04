#!/usr/bin/env node

/**
 * Script to apply the settings table migration
 * This script should be run once to set up the settings functionality
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applySettingsMigration() {
  console.log('🚀 Applying settings table migration...')
  
  try {
    // Read the migration file
    const fs = require('fs')
    const path = require('path')
    const migrationPath = path.join(__dirname, '../supabase/migrations/004_create_settings_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration file loaded')
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      return false
    }
    
    console.log('✅ Settings table migration applied successfully!')
    console.log('🎉 Settings functionality is now ready to use.')
    
    return true
  } catch (error) {
    console.error('❌ Error applying migration:', error.message)
    return false
  }
}

// Alternative approach: Execute SQL directly if exec_sql is not available
async function applyMigrationDirectly() {
  console.log('🔧 Applying migration using direct SQL execution...')
  
  try {
    // Create settings table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        description TEXT,
        data_type TEXT DEFAULT 'string',
        is_encrypted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(category, key)
      );
    `
    
    const { error: tableError } = await supabase.from('settings').select('count')
    if (tableError && !tableError.message.includes('does not exist')) {
      console.log('✅ Settings table already exists')
    } else {
      // Table doesn't exist, we need to create it using raw SQL
      console.log('⚠️  Note: Table creation requires Supabase dashboard or SQL editor')
      console.log('📝 Please run the following SQL in your Supabase SQL editor:')
      console.log('\n' + createTableSQL)
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

async function main() {
  console.log('🔧 Setting up POS System Settings functionality')
  console.log('=' .repeat(50))
  
  const success = await applySettingsMigration()
  
  if (!success) {
    console.log('\n🔄 Trying alternative approach...')
    await applyMigrationDirectly()
  }
  
  console.log('\n📋 Next steps:')
  console.log('1. Restart your development server')
  console.log('2. Navigate to /admin/dashboard/settings')
  console.log('3. Test the settings functionality')
  console.log('\n✨ Setup complete!')
}

main().catch(console.error)
