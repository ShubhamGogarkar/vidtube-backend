import 'dotenv/config' 
import connectDB from "./db/index.js";
import { app } from './app.js';



connectDB()
.then(() => {
  app.listen(process.env.PORT || 3005, () => {
    console.log(`app is listening on http://localhost:${process.env.PORT}`)
  })
})
.catch((err) => {
  console.log("mongo db connection failed!!:", err)
})

























// import express from "express"
// const app = express()

// (async () => {
 
//   try {
// await mongoose.connect(`${process.env.MONGODB_URI}`, {
//   dbName: DB_NAME,
// });

//     app.on("error", (error) => {
//       console.log("error while connecting express to mongo: ", error)
//     })

//     app.listen(process.env.PORT, () => {
//       console.log(`app is listening on https://localhost:${process.env.PORT}`)
//     })

//   } catch (error) {
//      console.log("error while connecting to DB :" + error) 
    
//   }
// })()