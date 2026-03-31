import express from "express"
import pool from "./pg.js"
import cors from "cors"
import bcrypt from "bcrypt"
import { validate } from "deep-email-validator"

const app = express()

app.use(cors())
app.use(express.json())

try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS languages (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            rating INTEGER DEFAULT 0
        )
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            gmail VARCHAR(255) NOT NULL UNIQUE,
            pass VARCHAR(255) NOT NULL,
            pick VARCHAR(100) DEFAULT ''
        )
    `)

    const result = await pool.query("SELECT COUNT(*) FROM languages")
    if (result.rows[0].count == 0) {
        const langs = ["Python","JavaScript","TypeScript","Java","C++","C#","Go","Rust","Swift","Kotlin","PHP","Ruby","HTML/CSS","SQL","Dart","R","Lua","Haskell","Assembly","MATLAB","Perl","Scala","Zig","Julia","Solidity","Elixir","Clojure","OCaml","Erlang"]
        for (let lang of langs) {
            await pool.query("INSERT INTO languages (name) VALUES ($1)", [lang])
        }
        console.log("✅ Языки добавлены")
    }
} catch (err) {
    console.error(err.message)
}

app.get("/dontsleep", async (req, res) => {
    res.json({ ok: true })
})

app.get("/lang", async (req, res) => {
    try {
        const data = await pool.query("SELECT * FROM languages ORDER BY rating DESC")
        res.json(data.rows)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.get("/delete", async (req, res) => {
    try {
        await pool.query("DELETE FROM users")
        res.json({ otvet: "All users deleted" })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.get("/users", async (req, res) => {
    try {
        const users = await pool.query("SELECT * FROM users")
        res.json(users.rows)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.post("/register", async (req, res) => {
    try {
        const { gmail, pass } = req.body
        
        const user = await pool.query("SELECT * FROM users WHERE gmail=$1", [gmail])
        if (user.rows.length > 0) return res.json({ otvet: "userRegistered" })
        
        if (pass.length < 8) return res.json({ otvet: "miniPass" })
        
        const valid = await validate(gmail)
        if (!valid.valid) return res.json({ otvet: "notFoundPost" })
        
        const hash = bcrypt.hashSync(pass, 10)
        const reg = await pool.query(
            "INSERT INTO users (gmail, pass, pick) VALUES ($1, $2, $3) RETURNING *", 
            [gmail, hash, ""]
        )
        
        res.json({ 
            otvet: "trueReg", 
            user: { gmail: reg.rows[0].gmail, pick: reg.rows[0].pick } 
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.post("/signin", async (req, res) => {
    try {
        const { gmail, pass } = req.body
        
        const user = await pool.query("SELECT * FROM users WHERE gmail=$1", [gmail])
        if (user.rows.length === 0) return res.json({ otvet: "notFound" })
        
        const match = bcrypt.compareSync(pass, user.rows[0].pass)
        if (match) {
            res.json({ 
                otvet: "trueSignin", 
                user: { gmail: user.rows[0].gmail, pick: user.rows[0].pick } 
            })
        } else {
            res.json({ otvet: "notPass" })
        }
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.post("/voice", async (req, res) => {
    try {
        const { gmail, newPick } = req.body
        
        const user = await pool.query("SELECT * FROM users WHERE gmail=$1", [gmail])
        if (user.rows.length === 0) return res.json({ otvet: "regPlease" })
        
        const current = user.rows[0].pick
        
        if (current === newPick) {
            await pool.query("UPDATE users SET pick='' WHERE gmail=$1", [gmail])
            await pool.query("UPDATE languages SET rating=rating-1 WHERE name=$1", [newPick])
            const upd = await pool.query("SELECT * FROM users WHERE gmail=$1", [gmail])
            return res.json({ 
                otvet: "cancelled", 
                user: { gmail: upd.rows[0].gmail, pick: upd.rows[0].pick } 
            })
        }
        
        if (current && current !== "") {
            await pool.query("UPDATE languages SET rating=rating-1 WHERE name=$1", [current])
        }
        
        await pool.query("UPDATE users SET pick=$1 WHERE gmail=$2", [newPick, gmail])
        await pool.query("UPDATE languages SET rating=rating+1 WHERE name=$1", [newPick])
        
        const upd = await pool.query("SELECT * FROM users WHERE gmail=$1", [gmail])
        res.json({ 
            otvet: "success", 
            user: { gmail: upd.rows[0].gmail, pick: upd.rows[0].pick } 
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server started on port ${PORT}`))