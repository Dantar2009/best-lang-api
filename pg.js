import { Pool } from "pg"
import dotenv from "dotenv"
dotenv.config()
// ВСЕГО ОДНА СТРОКА МЕНЯЕТСЯ
const pool = new Pool({
    connectionString:process.env.DATABASE_URL ,
    ssl: { rejectUnauthorized: false },
    family:4,
    port: 6543
})

export default pool