const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

//To select ID from MongoDB
const ObjectId = require("mongodb").ObjectId;

const app = express();
const port = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

var admin = require("firebase-admin");

var serviceAccount = "./firebase-adminsdk.json";

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

//MongoDB linking
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@travel-blogs.utina.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

//Verify with user token
async function verifyToken(req, res, next) {
	if (req.headers?.authorization?.startsWith("Bearer ")) {
		const token = req.headers.authorization.split(" ")[1];
		try {
			const decodedUser = await admin.auth().verifyIdToken(token);
			req.decodedEmail = decodedUser?.email;
		} catch {}
	}
	next();
}

async function run() {
	try {
		await client.connect();

		//DB Folder and Subfolder
		const database = client.db("travel-blogs");
		const blogsCollection = database.collection("blogs");
		const usersCollection = database.collection("users");
		const reviewsCollection = database.collection("reviews");
		const sliderCollection = database.collection("sliders");

		//To add new user when login or signup
		app.post("/users", async (req, res) => {
			const newuser = req.body;
			console.log("Request from UI ", newuser);
			const result = await usersCollection.insertOne(newuser);
			console.log("Successfully Added New User ", result);
			res.json(result);
		});
		//To update or replace users data when login or signup
		app.put("/users", async (req, res) => {
			console.log(req.body);
			const user = req.body;
			const filter = { email: user?.email };
			console.log("Request to replace or add user", user);
			const options = { upsert: true };
			const updateuser = {
				$set: {
					email: user?.email,
					displayName: user?.displayName,
					photoURL: user?.photoURL,
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updateuser,
				options,
			);
			res.json(result);
			console.log("Successfully replaced or added user", result);
		});
		//Check Admin or Not
		app.get("/users/:email", async (req, res) => {
			const email = req.params.email;
			console.log("from UI", email);
			const filter = { email: email };
			console.log("Request to find ", filter);
			const user = await usersCollection.findOne(filter);
			console.log(user);
			let isAdmin = false;
			if (user?.userRole === "Admin") {
				isAdmin = true;
			}
			res.json({ admin: isAdmin });
			console.log("Found one", user);
		});
		//To load single user data by email
		app.get("/singleUsers", async (req, res) => {
			const user = req.query;
			console.log("user", user);
			const filter = { email: user?.email };
			console.log("from UI", filter);
			console.log("Request to find ", filter);
			const result = await usersCollection.findOne(filter);
			res.send(result);
			console.log("Found one", result);
		});
		//To update single user data
		app.put("/users/updateUsers", async (req, res) => {
			console.log(req.body);
			const user = req.body;
			const filter = { email: user?.email };
			console.log("Request to replace or add user", user);
			const options = { upsert: true };
			const updateuser = {
				$set: {
					imageLink: user?.imageLink,
					title: user?.title,
					details: user?.details,
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updateuser,
				options,
			);
			res.json(result);
			console.log("Successfully replaced or added user", result);
		});
		//To update or replace users role
		app.put("/users/pageRole", verifyToken, async (req, res) => {
			const user = req.body;
			console.log("Decoded email", req.decodedEmail);
			const requester = req.decodedEmail;
			if (requester) {
				const requesterAccount = await usersCollection.findOne({
					email: requester,
				});
				if (requesterAccount.userRole === "Admin") {
					const filter = { email: user?.email };
					console.log("Request to replace or add Role", user);
					const options = { upsert: true };
					const updateuser = {
						$set: {
							userRole: user?.userRole,
						},
					};
					const result = await usersCollection.updateOne(
						filter,
						updateuser,
						options,
					);
					res.json(result);
					console.log("Successfully replaced or added user", result);
				} else {
					res
						.status(403)
						.json({ message: "You don't have access to make new Admin" });
				}
			}
		});
		/* ------
        ------post all
        ------ */

		//To post new reviews
		app.post("/reviews", async (req, res) => {
			const newReviews = req.body;
			console.log("Request from UI ", newReviews);
			const result = await reviewsCollection.insertOne(newReviews);
			console.log("Successfully Added New reviews ", result);
			res.json(result);
		});
		//To post new blogs
		app.post("/blogs", async (req, res) => {
			const blogs = req.body;
			console.log("Request from UI ", blogs);
			const result = await blogsCollection.insertOne(blogs);
			console.log("Successfully Added New blogs ", result);
			res.json(result);
		});

		// To store/update single project data
		app.put("/blogupdate/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to update ", id);
			const projectId = { _id: ObjectId(id) };
			const updatedReq = req.body;
			console.log("Comming form UI", updatedReq);
			const options = { upsert: true };
			const updateProject = {
				$set: {
					blogTitle: updatedReq.blogTitle,
					publishedBy: updatedReq.publishedBy,
					totalDays: updatedReq.totalDays,
					totalCost: updatedReq.totalCost,
					location: updatedReq.location,
					details: updatedReq.details,
					blogID: updatedReq.blogID,
					catagory: updatedReq.catagory,
				},
			};
			const result = await blogsCollection.updateOne(
				projectId,
				updateProject,
				options,
			);
			res.json(result);
			console.log("Updated Successfully", result);
		});

		//To post new sliders
		app.post("/sliders", async (req, res) => {
			const sliders = req.body;
			console.log("Request from UI ", sliders);
			const result = await sliderCollection.insertOne(sliders);
			console.log("Successfully Added New sliders ", result);
			res.json(result);
		});

		//To update blogs rating
		app.put("/blogRating", async (req, res) => {
			console.log(req.body);
			const user = req.body;
			const filter = { blogID: user?.blogID };
			console.log("Request to update rating", user);
			const options = { upsert: true };
			const updateuser = {
				$set: {
					rating: user?.rating,
					totalRating: user?.totalRating,
				},
			};
			const result = await blogsCollection.updateOne(
				filter,
				updateuser,
				options,
			);
			res.json(result);
			console.log("Successfully updated rating", result);
		});

		//To update blogs rating
		app.put("/blogconfirmation", async (req, res) => {
			console.log(req.body);
			const user = req.body;
			const filter = { blogID: user?.blogID };
			console.log("Request to update rating", user);
			const options = { upsert: true };
			const updateuser = {
				$set: {
					confirmation: user?.confirmation,
				},
			};
			const result = await blogsCollection.updateOne(
				filter,
				updateuser,
				options,
			);
			res.json(result);
			console.log("Successfully updated rating", result);
		});

		/* ------
        ------Show all
        ------ */

		//To Show all users
		app.get("/users", async (req, res) => {
			console.log(req.query);
			const get = usersCollection.find({});
			console.log("Request to find users");
			users = await get.toArray();
			res.send(users);
			console.log("Found all users", users);
		});
		//To Show all sliders
		app.get("/sliders", async (req, res) => {
			console.log(req.query);
			const get = sliderCollection.find({});
			console.log("Request to find sliders");
			sliders = await get.toArray();
			res.send(sliders);
			console.log("Found all sliders", sliders);
		});

		//To Show all reviews
		app.get("/reviews", async (req, res) => {
			console.log(req.query);
			const get = reviewsCollection.find({});
			console.log("Request to find reviews");
			reviews = await get.toArray();
			res.send(reviews);
			console.log("Found all reviews", reviews);
		});
		//To load reviews data by email
		app.get("/reviewsbyemail", async (req, res) => {
			const user = req.query;
			console.log("user", user);
			const result = await reviewsCollection
				.find({ userEmail: user?.email })
				.toArray();
			res.send(result);
			console.log("Found one", result);
		});
		//To load reviews data by email
		app.get("/blogsbyemail", async (req, res) => {
			const user = req.query;
			console.log("user", user);
			const result = await blogsCollection
				.find({ userEmail: user?.email })
				.toArray();
			res.send(result);
			console.log("Found one", result);
		});

		//To load reviews data by blogID
		app.get("/reviewss", async (req, res) => {
			const user = req.query;
			console.log("user", user);
			const result = await reviewsCollection
				.find({ blogID: user?.blogID })
				.toArray();
			res.send(result);
			console.log("Found one", result);
		});

		//To Show all blogs
		app.get("/blogs", async (req, res) => {
			console.log(req.query);
			const get = blogsCollection.find({});
			console.log("Request to find blogs");
			blogs = await get.toArray();
			res.send(blogs);
			console.log("Found all books", blogs);
		});

		//GET blogs
		app.get("/allblogs", async (req, res) => {
			const cursor = blogsCollection.find({});
			const page = req.query.page;
			const size = parseInt(req.query.size);
			let products;
			const count = await cursor.count();

			if (page) {
				products = await cursor
					.skip(page * size)
					.limit(size)
					.toArray();
			} else {
				products = await cursor.toArray();
			}

			res.send({
				count,
				products,
			});
		});

		//To load blogs by id
		app.get("/blogs/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to find ", id);
			const findId = { _id: ObjectId(id) };
			const result = await blogsCollection.findOne(findId);
			res.send(result);
			console.log("Found one", result);
		});

		/* ------
        ------delete all
        ------ */

		//To Delete user one by one
		app.delete("/users/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to delete ", id);
			const deleteId = { _id: ObjectId(id) };
			const result = await usersCollection.deleteOne(deleteId);
			res.send(result);
			console.log("user Successfully Deleted", result);
		});
		//To Delete sliders one by one
		app.delete("/sliders/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to delete ", id);
			const deleteId = { _id: ObjectId(id) };
			const result = await sliderCollection.deleteOne(deleteId);
			res.send(result);
			console.log("sliders Successfully Deleted", result);
		});
		//To Delete reviews one by one
		app.delete("/reviews/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to delete ", id);
			const deleteId = { _id: ObjectId(id) };
			const result = await reviewsCollection.deleteOne(deleteId);
			res.send(result);
			console.log("reviews Successfully Deleted", result);
		});

		//To Delete blogs one by one
		app.delete("/blogs/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to delete ", id);
			const deleteId = { _id: ObjectId(id) };
			const result = await blogsCollection.deleteOne(deleteId);
			res.send(result);
			console.log("blogs Successfully Deleted", result);
		});
	} finally {
		//await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("travel-blogs Server is running just fine");
});

app.listen(port, () => {
	console.log("travel-blogs Server running on port :", port);
});
