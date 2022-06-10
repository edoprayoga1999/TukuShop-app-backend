const { v4: uuidv4 } = require("uuid");
// const userModel = require("../models/user.model");
const { success, failed } = require("../helpers/response");
const productModel = require("../models/product.model");
const deleteFile = require("../helpers/deleteFile");
const uploadGoogleDrive = require("../helpers/uploadGoogleDrive");
// const deleteGoogleDrive = require("../helpers/deleteGoogleDrive");
const createPagination = require("../helpers/createPagination");

module.exports = {
	listProduct: async (req, res) => {
		try {
			const { page, limit, search = "", sort="" } = req.query;
			const count = await productModel.countProduct(search);
			const paging = createPagination(count.rows[0].count, page, limit);
			const products = await productModel.selectListProduct(paging, search, sort);

			// get product_image, product_size, product_color
			for(let i=0; i < products.rows.length; i++) {
				const productImages = await productModel.selectAllProductImage(products.rows[i].id);
				const productSizes = await productModel.selectAllProductSize(products.rows[i].id);
				const productColors = await productModel.selectAllProductColor(products.rows[i].id);

				products.rows[i].product_images = productImages.rows;
				products.rows[i].product_sizes = productSizes.rows;
				products.rows[i].product_color = productColors.rows;
			}

			success(res, {
				code: 200,
				status: "success",
				data: products.rows,
				message: "Select List Product Success",
				pagination: paging.response,
			});
		} catch (error) {
			failed(res, {
				code: 500,
				status: "error",
				message: "Internal Server Error",
				error: error.message,
			});
		}
	},
	newProduct: async (req, res) => {
		try {
			const products = await productModel.selectNewProduct();

			success(res, {
				code: 200,
				status: "success",
				data: products.rows,
				message: "Select New Product Success",
			});
		} catch (error) {
			failed(res, {
				code: 500,
				status: "error",
				message: "Internal Server Error",
				error: error.message,
			});
		}
	},
	addProduct: async (req, res) => {
		try {
			const {
				storeId,
				categoryId,
				brandId,
				productName,
				price,
				description,
				stock,
				productSizes,
				productColors,
			} = req.body;

			// insert product
			const productData = await productModel.insertProduct({
				id: uuidv4(),
				storeId,
				categoryId,
				brandId,
				productName,
				price,
				description,
				stock,
				rating: 8,
				date: new Date(),
				isActive: true,
			});

			// insert photo
			if (req.files) {
				if (req.files.photo) {
					req.files.photo.map(async (item) => {
						// upload photo baru ke gd
						const photoGd = await uploadGoogleDrive(item);
						await productModel.insertProductPhoto({
							id: uuidv4(),
							productId: productData.rows[0].id,
							photo: photoGd.id,
						});
						// menghapus photo setelah diupload ke gd
						deleteFile(item.path);
					});
				}
			}

			// insert product sizes
			productSizes.map(async (size) => {
				await productModel.insertProductSizes({
					id: uuidv4(),
					productId: productData.rows[0].id,
					size,
				});
			});

			// insert product colors
			productColors.map(async (color) => {
				await productModel.insertProductColors({
					id: uuidv4(),
					productId: productData.rows[0].id,
					colorName: color.colorName,
					colorValue: color.colorValue,
				});
			});

			success(res, {
				code: 200,
				status: "success",
				data: null,
				message: "Insert New Product Success",
			});
		} catch (error) {
			failed(res, {
				code: 500,
				status: "error",
				message: "Internal Server Error",
				error: error.message,
			});
		}
	},
};
