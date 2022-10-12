

/* 
:copyright: (c) 2022-present Kumar Aggarwal
:license: MIT, see LICENSE for more details.
*/




const { Bot, InlineKeyboard, InputFile, Keyboard, Context, session } = require("grammy");
const axios = require("axios");
const {telegram, store, medusa, mysql } = require("./config.json");

const {
  conversations,
  createConversation,
} = require("@grammyjs/conversations");


/*
1. Create Database telegram
2. Create table users with chat_id (varchar) and cookie (varchar)
**/
const database = require("mysql");
const connection = database.createPool({
  host: mysql.host,
  port: 3306,
  user: mysql.user,
  password: mysql.password,
  database: mysql.database,
});


const menuKeyboard = new InlineKeyboard()
  .text("Check my profile", "profileCheck").row()
  .text("Check my Orders", "orderCustomerCheck").row()
  .text("Check Order Details","orderCheck").row()
  .text("Search a product", "productSearch");

var bot = new Bot(telegram.token)


async function loginConversation(conversation, ctx) {
  await ctx.reply("Please enter your email");
  const email = await conversation.waitFor(":text");
  await ctx.reply("Please enter your password");
  const password = await conversation.waitFor(":text");
  await ctx.reply("Wait, logging you into the store...");

  loginAxios(ctx, email, password)

}

async function productSearchConversation(conversation, ctx) {
  await ctx.reply("Please enter a search query");
  const query = await conversation.waitFor(":text");
  searchProduct(query.msg.text, ctx);
}

async function orderCheckConversation(conversation, ctx) {
  await ctx.reply("Please enter order ID");
  const orderId = await conversation.waitFor(":text");
  orderCheck(orderId.msg.text, ctx);
}



bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

bot.use(createConversation(loginConversation));
bot.use(createConversation(productSearchConversation));
bot.use(createConversation(orderCheckConversation));

const inlineKeyBoardLogin = new InlineKeyboard().text("Login", "loginAction").row();



function loginAxios(ctx, email, password) {

  var data = JSON.stringify({
    "email": email.msg.text,
    "password": password.msg.text
  });

  var config = {
    method: 'post',
    url: medusa.baseUrl + '/store/auth',
    headers: {
      'Content-Type': 'application/json',
    },
    data: data
  };
  axios(config)
    .then(async function (response) {
      var data = JSON.stringify(response.data);
      data = JSON.parse(data)
      console.log(data);
      var headers = JSON.stringify(response.headers);
      var cookie = JSON.parse(headers)['set-cookie'];

      var cookieKey = "connect.sid";
      var startIndexForToken = cookie.indexOf(cookieKey) + cookieKey.length + 1;
      var token = cookie.substring(startIndexForToken).split(";")[0];

      connection.query(
        `SELECT * FROM users WHERE chat_id = '${ctx.msg.chat.id}'`,
        (err, result) => {
          if (err) throw err;
          if (result.length > 0) {
            connection.query(
              `UPDATE users SET cookie = '${token}' WHERE chat_id = '${ctx.msg.chat.id}'`,
              (err, result) => {
                if (err) throw err;
              }
            );
          } else {

            connection.query(
              `INSERT INTO users (chat_id, cookie) VALUES ('${ctx.msg.chat.id}', '${token}')`,
              (err, result) => {
                if (err) throw err;
                console.log("Added one user to the database");
              }
            );
          }
        }
      );
      await ctx.reply("You have been logged in: " + data.customer.first_name, {
        reply_markup: menuKeyboard,
      });
    })
    .catch(function (error) {
      console.log(error);
    });

}


function searchProduct(query, ctx) {
  if (query.startsWith("prod")) {
    var data = '';
    var config = {
      method: 'get',
      url: `${medusa.baseUrl}/store/products/${query}`,
      data: data
    };

    axios(config)
      .then(async function (response) {
        var data = JSON.parse(JSON.stringify(response.data));
        console.log(data.product);
        var thumbnail = data.product.thumbnail;
        var variant = data.product.variants[0];
        console.log(variant);
        var handle = data.product.handle;
        var productHtml = buildProductHtml(data.product.id, data.product.description,store.url,variant.prices[0].amount / 100, variant.prices[0].currency_code, data.product.title);
        console.log(productHtml);
        await ctx.replyWithPhoto(new InputFile({ url: thumbnail }));
        await ctx.reply(productHtml, {
          parse_mode: "HTML",
        }
        );
      })
      .catch(function (error) {
        console.log(error);
      });


  } else {
    var data = '';

    var config = {
      method: 'post',
      url: `${medusa.baseUrl}/store/products/search?q=${query}`,
      data: data
    };

    axios(config)
      .then(async function (response) {
        var data = JSON.parse(JSON.stringify(response.data));
        var hits = data.hits;
        if (hits.length > 0) {

          hits.forEach(async hit => {
            var thumbnail = hit.thumbnail;
            var handle = hit.handle;
            var productSearchHitHtml = buildProductSearchDetailHitHtml(hit.title, hit.description,store.url)
            await ctx.replyWithPhoto(new InputFile({ url: thumbnail }));
            await ctx.reply(productSearchHitHtml, {
              parse_mode: "HTML",
            }
            );
          });
        }
        else{
          ctx.reply("No results found\nSearch with different query or Try other option",{
            reply_markup: menuKeyboard,
          });
        }
      })
      .catch(function (error) {
        console.log(error);
        ctx.reply("Internal Server error, Try again..",{
          reply_markup: menuKeyboard,
        });
      });

  }
}


function profileCheck(ctx){
  connection.query(
    `SELECT * FROM users WHERE chat_id = ${ctx.msg.chat.id}`,
    async (err, result) => {
      if (err) console.log(err);
      if (result.length < 1) {
        await ctx.reply("Your account is not linked, please login again");
        await ctx.conversation.enter("loginConversation");
      } else {
        let account = result[0];
        var data = '';
        var config = {
          method: 'get',
          url: `${medusa.baseUrl}/store/auth/`,
          headers: { 
            'Cookie': `connect.sid=${account.cookie}`,
          },
          data : data
        };
        
        axios(config)
        .then(function (response) {
          var data =  JSON.parse(JSON.stringify(response.data));
          console.log(data.customer);
          var customerDetailHTML = buildCustomerHTML(data.customer);
          ctx.reply(customerDetailHTML, {
            parse_mode: "HTML",
          }
          );
        })
        .catch(async function (error) {
          console.log(error);
          await ctx.reply("Your token has expired, please login again");
          await ctx.conversation.enter("loginConversation");
        });
      }
    });
  }


function orderCheck(orderId, ctx){

  connection.query(
    `SELECT * FROM users WHERE chat_id = ${ctx.msg.chat.id}`,
    async (err, result) => {
      if (err) console.log(err);
      if (result.length < 1) {
        await ctx.reply("Your account is not linked, please login again");
        await ctx.conversation.enter("loginConversation");
      } else {
        let account = result[0];
        var data = '';
        var config = {
          method: 'get',
          url: `${medusa.baseUrl}/store/orders/${orderId}`,
          headers: { 
            'Cookie': `connect.sid=${account.cookie}`,
          },
          data : data
        };

        axios(config)
        .then(function (response) {
          var data =  JSON.parse(JSON.stringify(response.data));
          console.log(data.order);
          var order = data.order;
          
          var orderDetailHTML = buildOrderDetailHTML(order);
          ctx.reply(orderDetailHTML, {
            parse_mode: "HTML",
          }
          ); 
        })
        .catch(async function (error) {
          console.log(error);
          ctx.reply("This orderId does not exist\nSearch with different id or Try other option",{
            reply_markup: menuKeyboard,
          });
        });
        
      }
    });

}


function orderCustomerCheck(ctx){

  connection.query(
    `SELECT * FROM users WHERE chat_id = ${ctx.msg.chat.id}`,
    async (err, result) => {
      if (err) console.log(err);
      if (result.length < 1) {
        await ctx.reply("Your account is not linked, please login again");
        await ctx.conversation.enter("loginConversation");
      } else {
        let account = result[0];
        var data = '';
        var config = {
          method: 'get',
          url: `${medusa.baseUrl}/store/auth/`,
          headers: { 
            'Cookie': `connect.sid=${account.cookie}`,
          },
          data : data
        };
        
        axios(config)
        .then(function (response) {
          var data =  JSON.parse(JSON.stringify(response.data));
          console.log(data.customer);
          var orders = data.customer.orders;
          if(orders.length > 0){
            var orderCustomerDetailsHTML = buildOrderCustomerHTML(data.customer.orders);
          ctx.reply(orderCustomerDetailsHTML, {
            parse_mode: "HTML",
          }
          );
          }else{
            ctx.reply("No Orders found\nSearch with different query or Try other option",{
              reply_markup: menuKeyboard,
            });
          }
          
        })
        .catch(async function (error) {
          console.log(error);
          await ctx.reply("Your token has expired, please login again");
          await ctx.conversation.enter("loginConversation");
        });
      }
    });


}

/*
Add searchable attributes and construct accordingly, this is just an example
*/
function buildProductSearchDetailHitHtml(title, description, productUrl) {
  var productHitHtml = `<b><u><i>Product Details: </i></u></b>
    <b>Product Id: </b>${productId}
    <b>Description: </b>${description}
    <b>Title: </b>${title}
    <a href=${productUrl}>Buy here</a>`;

  return productHitHtml;

}

function buildProductHtml(productId, description, productUrl, price, currency, title){

  var productHtml = `<b><u><i>Product Details: </i></u></b>
    <b>Product Id: </b>${productId}
    <b>Description: </b>${description}
    <b>Title: </b>${title}
    <b>Price: </b>${price} ${currency}
    <a href=${productUrl}>Buy here</a>\n`

  return productHtml;
}


function buildCustomerHTML(customer){
 
  var customerDetailHTML = `<b><u><i>Customer Details: </i></u></b>
    <b>Customer Id: </b>${customer.id}
    <b>Email: </b>${customer.email}
    <b>First Name: </b>${customer.first_name}
    <b>Last Name: </b>${customer.last_name}\n
    <b>Orders: </b>${customer.orders.length}`

  return customerDetailHTML;

}


function buildOrderCustomerHTML(orders){

  var orderCustomerHTML = `<b><u><i>Orders: </i></u></b>
  You have ${orders.length} orders.\n\n${orders
    .map((order) => {
      return `**${order.id}** - ${order.status}\n`;
    })
    .join("")}`

    return orderCustomerHTML;
}


function buildOrderDetailHTML(order){
  let date = new Date(order.created_at);
  var orderDetailHTML = `<b><u><i>Order Details: </i></u></b>
  <b>Order Id: </b>${order.id}
  <b>Status: </b>Status:${order.status}\n${order.items
    .map((item) => {
      return `**${item.title}** - ${item.quantity}x\n`;
    })
    .join("")}
  <b>Purchase date: </b>${date.getDate()}/${date.getMonth()}/${date.getFullYear()}
  <b>Shipping address: </b>${order.shipping_address.address_1} ${order.shipping_address.address_2} ${order.shipping_address.postal_code}\n${order.shipping_address.city}
  <b>Subtotal: </b>${order.subtotal / 100} ${order.currency_code}
  <b>Shipping Price: </b>${order.shipping_methods[0].price / 100} ${order.currency_code}
  <b>Total: </b>${order.total / 100} ${order.currency_code}`

return orderDetailHTML;

}

bot.callbackQuery("loginAction", async (ctx) => {
  await ctx.conversation.enter("loginConversation");
});

bot.callbackQuery("productSearch", async (ctx) => {
  await ctx.conversation.enter("productSearchConversation");
});

bot.callbackQuery("profileCheck", async (ctx) => {
  profileCheck(ctx);
});

bot.callbackQuery("orderCheck", async (ctx) => {
  await ctx.conversation.enter("orderCheckConversation");
});


bot.callbackQuery("orderCustomerCheck", async (ctx) => {
  orderCustomerCheck(ctx);
});

// Handle the /start command.
bot.command("start", async (ctx) => ctx.reply('Hi, Welcome to ' + store.name + '\nPlease Login to browse store, see your orders and update your profile.', {
  reply_markup: inlineKeyBoardLogin,
}));


// Handle other messages.
bot.on("message", (ctx) => ctx.reply("Please chose one option", {
  reply_markup: menuKeyboard,
}));




bot.start();