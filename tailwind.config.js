/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
  // 🛡️ الحل السحري: أجبر الاحتفاظ بكل الأرقام والألوان المستخدمة في المزايدة
  safelist: [
    // أرقام المزايدة (عادة من 1 إلى 13، أو حسب لعبتكم)
    { pattern: /text-(2|3|4|5|6|7|8|9|10|11|12|13)xl/ },
    { pattern: /text-(2|3|4|5|6|7|8|9|10|11|12|13)xl/ },
    // ألوان الأزرار والخلفيات التي قد تظهر ديناميكياً
    { pattern: /bg-(red|blue|green|yellow|gray|indigo|purple|pink)-(100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-(red|blue|green|yellow|gray|indigo|purple|pink)-(100|200|300|400|500|600|700|800|900)/ },
    // أحجام وأبعاد البطاقات والأزرار
    { pattern: /w-(4|5|6|8|10|12|14|16|20|24|28|32)/ },
    { pattern: /h-(4|5|6|8|10|12|14|16|20|24|28|32)/ },
    // هوامش وحواف
    "rounded-xl", "rounded-full", "shadow-lg", "border-2",
  ],
};
