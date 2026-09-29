const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/src/services/places/placeProvider.ts');
let content = fs.readFileSync(filePath, 'utf8');

const updates = [
  {
    id: 'hyd_bawarchi_01',
    foodItems: "[{name:'Mutton Biryani', price:320, verified:true}, {name:'Chicken Biryani', price:280, verified:true}, {name:'Kebabs', price:250, verified:true}]",
    links: "{ swiggy: 'https://www.swiggy.com/city/hyderabad/bawarchi-rtc-x-roads-musheerabad-rest11435', zomato: 'https://www.zomato.com/hyderabad/bawarchi-rtc-x-roads', googleMaps: 'https://maps.google.com/?q=Bawarchi+Restaurant+RTC+X+Roads+Hyderabad' }"
  },
  {
    id: 'hyd_shadab_07',
    foodItems: "[{name:'Mutton Biryani', price:280, verified:true}, {name:'Haleem', price:180, verified:true}, {name:'Kebabs', price:200, verified:true}]",
    links: "{ swiggy: 'https://www.swiggy.com/city/hyderabad/hotel-shadab-madina-ghansi-bazaar-rest18498', zomato: 'https://www.zomato.com/hyderabad/hotel-shadab-ghansi-bazaar', googleMaps: 'https://maps.google.com/?q=Hotel+Shadab+Madina+Hyderabad' }"
  },
  {
    id: 'hyd_jewel_of_nizam_02',
    foodItems: "[{name:'Mutton Biryani', price:650, verified:true}, {name:'Kebabs', price:500, verified:true}, {name:'Kacchi Gosht', price:700, verified:true}]",
    links: "{ zomato: 'https://www.zomato.com/hyderabad/jewel-of-nizam-gandipet', googleMaps: 'https://maps.google.com/?q=Jewel+of+Nizam+Gandipet+Hyderabad' }"
  },
  {
    id: 'hyd_over_the_moon_03',
    foodItems: "[{name:'Craft Beer', price:350, verified:true}, {name:'Pizza', price:450, verified:true}, {name:'Cocktails', price:400, verified:true}]",
    links: "{ swiggy: 'https://www.swiggy.com/city/hyderabad/over-the-moon-brew-company-gachibowli-rest269441', zomato: 'https://www.zomato.com/hyderabad/over-the-moon-brew-company-gachibowli', googleMaps: 'https://maps.google.com/?q=Over+The+Moon+Brew+Company+Gachibowli+Hyderabad' }"
  },
  {
    id: 'hyd_olive_bistro_06',
    foodItems: "[{name:'Pizza', price:550, verified:true}, {name:'Pasta', price:500, verified:true}, {name:'Cocktails', price:450, verified:true}]",
    links: "{ zomato: 'https://www.zomato.com/hyderabad/olive-bistro-jubilee-hills', googleMaps: 'https://maps.google.com/?q=Olive+Bistro+Jubilee+Hills+Hyderabad' }"
  },
  {
    id: 'hyd_tatva_04',
    foodItems: "[{name:'Paneer Tikka', price:380, verified:true}, {name:'Dal Makhani', price:320, verified:true}, {name:'Pasta', price:420, verified:true}]",
    links: "{ zomato: 'https://www.zomato.com/hyderabad/tatva-jubilee-hills', googleMaps: 'https://maps.google.com/?q=Tatva+Jubilee+Hills+Hyderabad' }"
  },
  {
    id: 'hyd_chutneys_10',
    foodItems: "[{name:'Masala Dosa', price:180, verified:true}, {name:'Idli', price:120, verified:true}, {name:'Filter Coffee', price:60, verified:true}]",
    links: "{ swiggy: 'https://www.swiggy.com/city/hyderabad/chutneys-banjara-hills-rest14498', zomato: 'https://www.zomato.com/hyderabad/chutneys-banjara-hills', googleMaps: 'https://maps.google.com/?q=Chutneys+Banjara+Hills+Hyderabad' }"
  },
  {
    id: 'hyd_zero40_09',
    foodItems: "[{name:'Craft Beer', price:300, verified:true}, {name:'Pizza', price:400, verified:true}, {name:'Burger', price:350, verified:true}]",
    links: "{ zomato: 'https://www.zomato.com/hyderabad/zero40-brewing-jubilee-hills', googleMaps: 'https://maps.google.com/?q=Zero40+Brewing+Jubilee+Hills+Hyderabad' }"
  },
  {
    id: 'hyd_ten_downing_05',
    foodItems: "[{name:'Craft Beer', price:300, verified:true}, {name:'Cocktails', price:350, verified:true}, {name:'Fish and Chips', price:450, verified:true}]",
    links: "{ zomato: 'https://www.zomato.com/hyderabad/10-downing-street-begumpet', googleMaps: 'https://maps.google.com/?q=10+Downing+Street+Begumpet+Hyderabad' }"
  },
  {
    id: 'hyd_roastery_08',
    foodItems: "[{name:'Cold Brew Coffee', price:250, verified:true}, {name:'Cappuccino', price:200, verified:true}, {name:'Cheese Platter', price:380, verified:true}]",
    links: "{ zomato: 'https://www.zomato.com/hyderabad/roastery-coffee-house-banjara-hills', googleMaps: 'https://maps.google.com/?q=Roastery+Coffee+House+Banjara+Hills+Hyderabad' }"
  }
];

updates.forEach(u => {
  const regex = new RegExp(`(id:\\s*'${u.id}',[\\s\\S]*?cuisine:\\s*\\[.*\\],)`);
  content = content.replace(regex, `$1\n    foodItems: ${u.foodItems},`);
  
  const linkRegex = new RegExp(`(id:\\s*'${u.id}',[\\s\\S]*?)directionsUrl:\\s*'.*?',\\n(\\s*description:)`);
  content = content.replace(linkRegex, `$1links: ${u.links},\n$2`);
});

fs.writeFileSync(filePath, content);
console.log("Updated places");
