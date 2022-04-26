require("date-utils")
const puppeteer = require("puppeteer")
const cheerio = require("cheerio");
const BASE_URL = process.env.BLOG_URL
const mysql = require('mysql');
const conn = {
    host: process.env.HOST,
    port: '3306',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function InsertPostToDBIfIsNotInserted(title, url, date) {
    const connection = mysql.createConnection(conn);
    connection.connect();

    title = title.replaceAll("'", " ").replaceAll('"', " ")

    const findByTitleQuery = "SELECT * FROM POST WHERE title = '" + title + "'";

    let isNotStored
    connection.query(findByTitleQuery, function (err, r, fields) {
        if (err) {
            console.log(err);
        }
        isNotStored = r[0];
    });
    if (!isNotStored) {
        console.log("ALREADY_STORED: ", title)
        return
    }

    console.log("[NEW] Data Input: ", title)

    return
    const insertDataQuery = "INSERT INTO `POST` (`title`,`url`, `create_at`) VALUES ('"+title+"', '" + url +"', '" + date +"');";

    connection.query(insertDataQuery, function (err, results, fields) {
        if (err) {
            console.log(err);
        }
    });

    connection.end();

}

async function begin() {
    console.log("======== Starting Process ========")
    const browser = await puppeteer.launch({
        headless: true
        }
    )

    const page = await browser.newPage()

    await page.goto(BASE_URL)
    await page.click("#category-name > div > table.post-body > tbody > tr > td.bcc > div > a")
    await page.waitForSelector("#listCountToggle")
    await page.click("#listCountToggle")
    await page.click("#changeListCount > a:nth-child(5)")
    await page.waitForSelector("#listTopForm > table > tbody > tr:nth-child(25)")

    const content = await page.content()
    const $ = cheerio.load(content)
    const list = $("#listTopForm > table > tbody")

    let sel;
    let dateSel;
    for (let i = 1; i <= 30; i++) {
        sel = " tr:nth-child(" + parseInt(i) + ") > td.title > div > span > a"
        dateSel = " tr:nth-child(" + parseInt(i) + ") > td.date > div > span"
        const title = $(list).find(sel).text()
        const url = $(list).find(sel).attr("href")
        let date = $(list).find(dateSel).text()
        date = toStringByFormatting(new Date(date))

        if (!title) continue
        await InsertPostToDBIfIsNotInserted(title, url, date)
    }

    await browser.close()
}


async function roop() {
    await begin()
    console.log("====== END PRECONSTRUCT ======")
    setInterval(function () {
        let newDate = new Date();
        let Htime = newDate.toFormat("HH24");
        let Mtime = newDate.toFormat("MI");
        let Stime = newDate.toFormat("SS");

        if (Mtime === "00" && Stime === "00") {
            begin()
                .then(
                    function () {
                        console.log(`${Htime}:${Mtime}:${Stime}` + ": WORK SUCCESS");
                    }
                )
        }
    }, 1000);
}

function leftPad(value) {
    if (value >= 10) {
        return value;
    }

    return `0${value}`;
}

function toStringByFormatting(source, delimiter = '-') {
    const year = source.getFullYear();
    const month = leftPad(source.getMonth() + 1);
    const day = leftPad(source.getDate());

    return [year, month, day].join(delimiter);

}

roop()
