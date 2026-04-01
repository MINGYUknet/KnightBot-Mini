const axios = require('axios')

// regex Twitter/X
const twitterRegex = /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s]+/gi

module.exports = {
  name: "twitter",
  alias: ["tw", "xdl"],
  desc: "Download Twitter/X media",
  category: "downloader",

  async run({ m, sock, args, body }) {
    try {
      let url

      // dari command
      if (args[0]) {
        url = args[0]
      }

      // auto detect
      else if (body && twitterRegex.test(body)) {
        url = body.match(twitterRegex)[0]
      }

      if (!url) {
        return m.reply("❌ Masukkan link Twitter!\nContoh:\n.twitter https://twitter.com/xxxx")
      }

      // loading react
      await sock.sendMessage(m.chat, {
        react: { text: '📥', key: m.key }
      })

      // API request
      let api = `https://api.tiklydown.eu.org/api/download/twitter?url=${url}`
      let res = await axios.get(api)

      if (!res.data || !res.data.video) {
        return m.reply("❌ Gagal mengambil video")
      }

      let video = res.data.video

      // kirim video
      await sock.sendMessage(m.chat, {
        video: { url: video },
        caption: "🐦 Twitter/X Downloader"
      }, { quoted: m })

    } catch (err) {
      console.log("Twitter Error:", err)
      m.reply("❌ Gagal download (link error / API down)")
    }
  }
}
