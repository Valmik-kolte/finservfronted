const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/dealer/DealerDashboard.jsx');
let c = fs.readFileSync(file, 'utf8');

// 1. Replace storedDealer useEffect with getDealerById fetch
const oldEffect = /useEffect\(\(\) => \{[\s\S]*?storedDealer[\s\S]*?\}, \[\]\);/;
const newEffect = `useEffect(() => {
    const dealerId = localStorage.getItem("dealerId");
    if (!dealerId) return;
    getDealerById(dealerId)
      .then((res) => {
        const d = res.data;
        setProfileData({
          name: d.fullName || d.name || "Dealer",
          phone: d.mobileNumber || d.phone || "",
          email: d.email || "",
          dealerCode: d.dealerCode || "\u2014",
        });
        localStorage.setItem("dealerCode", d.dealerCode || "");
      })
      .catch((err) => console.log("Profile fetch error:", err));
  }, []);`;

c = c.replace(oldEffect, newEffect);

// 2. Replace hardcoded DLR2091 with profileData.dealerCode
c = c.split('DLR2091').join('{profileData.dealerCode}');

fs.writeFileSync(file, c, 'utf8');
console.log('Done');
