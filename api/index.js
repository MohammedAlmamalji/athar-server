const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const Minio = require('minio');

const app = express();

// تفعيل الـ CORS حتى تطبيق الفلاتر يكدر يتصل بالسيرفر
app.use(cors());
app.use(express.json());

// إعدادات الـ Minio مالتك
const minioClient = new Minio.Client({
    endPoint: 'fra1.digitaloceanspaces.com',
    port: 443,
    useSSL: true,
    accessKey: 'DO00MJCWX3PM6T32ER2F',
    secretKey: 'QQYAbxncIiO71vdreKqgTAraEjmIxsFok+r0eq3L5lo'
});

// المسار (Route) الخاص بالتحميل
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "الرجاء إرسال رابط يوتيوب" });

        // جلب معلومات الفيديو
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;

        // سحب الصوت فقط بأعلى جودة
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        
        // توليد اسم ملف فريد
        const randomStr = Math.random().toString(36).substring(2, 15);
        const fileName = `songs/${Date.now()}_${randomStr}.mp3`;

        // الرفع المباشر إلى DigitalOcean
        await minioClient.putObject('athar-assets', fileName, stream, {
            'x-amz-acl': 'public-read',
            'Content-Type': 'audio/mpeg'
        });

        const finalUrl = `https://athar-assets.fra1.digitaloceanspaces.com/${fileName}`;

        res.status(200).json({ success: true, url: finalUrl, title: title });
    } catch (error) {
        console.error("Error details:", error);
        res.status(500).json({ error: "حدث خطأ أثناء معالجة الرابط" });
    }
});

// ضروري جداً لـ Vercel
module.exports = app;