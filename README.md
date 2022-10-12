## medusa-leo
![Medusa Hackathon 2022](https://i.postimg.cc/CL1kLJnP/dots-cover-template.jpg)

## About

### Participants
Kumar Aggarrwal - [Github](https://github.com/kaggrwal "@kaggrwal")  [Discord](https://discordapp.com/users/IPI#7729)

### Description

Leo provies an integration between Telegram & Medusajs, Customers can check search for products, check for their orders and look up their profile.

### Preview

![Demo](https://s4.gifyu.com/images/ezgif-3-c80d187e53.gif)

## Set up Project

### Prerequisites
Before you start with the tutorial make sure you have

- [Node.js](https://nodejs.org/en/) v16.9.0 or greater installed on your machine
- Medusa fully set up
- Mysql server

### Install Project

1. Clone the repository:
```bash
git clone https://github.com/kaggrwal/medusa-leo
```
2. Create a Bot from botfather, [refer here](https://riptutorial.com/telegram-bot/example/25075/create-a-bot-with-the-botfather)

3. Configuration:
Change the configuration to your liking, put the bot token, mysql and store configuration

4. Create a Database telegram
* Create users table 
* column called chat_id of type VARCHAR
* column called cookie of type VARCHAR
```example query:
  CREATE TABLE
  `users` (
    `id` int unsigned NOT NULL AUTO_INCREMENT,
    `chat_id` varchar(255) DEFAULT NULL,
    `cookie` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`)
  ) ENGINE = InnoDB AUTO_INCREMENT = 4 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
```

4. Change directory and install dependencies:
```bash
cd medusa-stonkers
npm install
```

5. Run!
```bash
node .
```

## Resources
- [Medusa’s GitHub repository](https://github.com/medusajs/medusa)
- [Medusa Documentation](https://docs.medusajs.com/)
- [grammY](https://grammy.dev/)
