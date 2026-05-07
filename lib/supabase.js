import { createClient } from '@supabase/supabase-js'

const url = 'https://vcvelxelysolvasrppco.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjdmVseGVseXNvbHZhc3JwcGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTUzMjcsImV4cCI6MjA5Mjk5MTMyN30.m13mV2sxNW8dMYwO4p1Kw9zXIDhhi_FA8F4u-rYBBWk'

export const sb = createClient(url, key)
export const supabase = sb