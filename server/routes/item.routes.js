require('dotenv').config();
const ObjectId = require('mongoose').Types.ObjectId;
const cloudinary = require('cloudinary').v2;
const uploader = require('../config/cloudinary');

const router = require('express').Router();
const isLoggedIn = require('../middleware/isLoggedIn');
const Item = require('../models/Item.model');
const User = require('../models/User.model');

router.get('/', (req, res) => {
    const pipeline = (query) => {
        // console.log(query);
        const { search, category, skip, sort, limit, distance, long, lat } =
            query;
        const sold = !!query.sold;
        const match = {
            ...(category && { category }),
            sold,
        };

        const sortOptions = {
            relevance: { score: -1 },
            price_asc: { price: 1 },
            price_desc: { price: -1 },
            date_asc: { updatedAt: 1 },
            date_desc: { updatedAt: -1 },
        };

        const withLocation = lat && long && distance;

        if (search) {
            return [
                { $match: { $text: { $search: search } } },
                { $match: match },
                ...(withLocation
                    ? [
                          {
                              $match: {
                                  'location.geometry.coordinates': {
                                      $geoWithin: {
                                          $centerSphere: [
                                              [Number(long), Number(lat)],
                                              Number(distance) / 6378.15214,
                                          ],
                                      },
                                  },
                              },
                          },
                      ]
                    : []),
                { $addFields: { score: { $meta: 'textScore' } } },
                {
                    $sort: {
                        ...(sort ? sortOptions[sort] : sortOptions.relevance),
                        _id: 1,
                    },
                },
                { $skip: parseInt(skip ? skip : 0) },
                { $limit: parseInt(limit ? limit : 20) },
            ];
        } else {
            return [
                { $match: match },
                ...(withLocation
                    ? [
                          {
                              $match: {
                                  'location.geometry.coordinates': {
                                      $geoWithin: {
                                          $centerSphere: [
                                              [Number(long), Number(lat)],
                                              Number(distance) / 6378.15214,
                                          ],
                                      },
                                  },
                              },
                          },
                      ]
                    : []),
                {
                    $sort: {
                        ...(sort ? sortOptions[sort] : sortOptions.date_desc),
                        _id: 1,
                    },
                },
                { $skip: parseInt(skip ? skip : 0) },
                { $limit: parseInt(limit ? limit : 20) },
            ];
        }
    };

    // console.dir(
    //     pipeline(req.query)[1]['$match']['location.geometry.coordinates'][
    //         '$geoWithin'
    //     ]
    // );
    Item.aggregate(pipeline(req.query))
        .then((match) => {
            res.json(match);
        })
        .catch((error) => {
            res.json(error);
        });
});

router.get('/:id', (req, res) => {
    const { id } = req.params;
    const { long, lat } = req.query;

    const pipeline =
        long && lat
            ? [
                  {
                      $geoNear: {
                          query: { _id: ObjectId(id) },
                          near: {
                              type: 'Point',
                              coordinates: [Number(long), Number(lat)],
                          },
                          distanceField: 'distance',
                      },
                  },
              ]
            : [
                  {
                      $match: {
                          _id: ObjectId(id),
                      },
                  },
              ];

    Item.aggregate(pipeline)
        .then((result) => {
            const item = result[0];
            if (!item) {
                throw new Error('Item not found');
            }
            User.populate(item, { path: 'owner' }).then((populatedItem) => {
                const { username, _id, itemsForSale } = populatedItem.owner;

                populatedItem.owner = { username, _id, itemsForSale };
                res.json(populatedItem);
            });
        })
        .catch((error) => {
            res.json(error);
        });
});

router.post('/', (req, res) => {
    Item.create({ ...req.body })
        .then((item) => {
            User.findByIdAndUpdate(
                item.owner,
                {
                    $push: { itemsForSale: item._id },
                },
                { new: true }
            ).then(() => {
                console.log('Item added to user');
            });
            return item;
        })
        .then((item) => {
            res.json(item);
        })
        .catch((error) => {
            res.json(error);
        });
});

router.put('/:id', (req, res) => {
    const { id } = req.params;
    Item.findByIdAndUpdate(id, req.body, { new: true })
        // .populate('owner')
        .then((updatedItem) => {
            res.json(updatedItem);
        })
        .catch((error) => {
            res.json(error);
        });
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    Item.findByIdAndDelete(id)
        .then((deletedItem) => {
            return User.findByIdAndUpdate(
                deletedItem.owner,
                {
                    $pull: { itemsForSale: deletedItem._id },
                },
                { new: true }
            );
        })
        .then((updatedUser) => {
            res.json(updatedUser);
        })
        .catch((error) => {
            res.json(error);
        });
});

router.post('/images', uploader.any('images'), (req, res) => {
    const imageUrls = req.files.map((file) => file.path);
    res.json(imageUrls);
});

module.exports = router;
