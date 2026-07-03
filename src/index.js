import 'dotenv/config' 
import connectDB from "./db/index.js";



connectDB()


























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