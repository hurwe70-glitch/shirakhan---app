const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// ══ إرسال Push لكل المستخدمين عند إضافة إشعار ══
exports.sendPushOnNewNotif = functions.firestore
  .document("notifications/{notifId}")
  .onCreate(async (snap, context) => {
    const notif = snap.data();
    if (!notif) return null;

    // جلب كل FCM tokens
    const tokensSnap = await admin.firestore().collection("fcm_tokens").get();
    const tokens = tokensSnap.docs
      .map((d) => d.data().token)
      .filter(Boolean);

    if (tokens.length === 0) {
      console.log("No FCM tokens found");
      return null;
    }

    const message = {
      notification: {
        title: notif.title || "شريخان لايف 🏡",
        body: notif.body || "",
      },
      android: {
        notification: {
          sound: "default",
          channelId: "shirakhan_notifs",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: "https://hurwe70-glitch.github.io/shirakhan---app/icon.png",
          badge: "https://hurwe70-glitch.github.io/shirakhan---app/icon.png",
          vibrate: [200, 100, 200],
          requireInteraction: false,
          dir: "rtl",
          lang: "ar",
        },
        fcmOptions: {
          link: "https://hurwe70-glitch.github.io/shirakhan---app/",
        },
      },
      tokens: tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `✅ Sent to ${response.successCount}/${tokens.length} devices`
      );

      // احذف الـ tokens الفاشلة
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const err = resp.error?.code;
          if (
            err === "messaging/invalid-registration-token" ||
            err === "messaging/registration-token-not-registered"
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      // حذف الـ tokens الفاشلة من Firestore
      if (failedTokens.length > 0) {
        const batch = admin.firestore().batch();
        tokensSnap.docs.forEach((d) => {
          if (failedTokens.includes(d.data().token)) {
            batch.delete(d.ref);
          }
        });
        await batch.commit();
        console.log(`🗑️ Removed ${failedTokens.length} invalid tokens`);
      }
    } catch (err) {
      console.error("FCM send error:", err);
    }

    return null;
  });
