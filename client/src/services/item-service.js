import axios from 'axios';

const service = axios.create({
    baseURL: '/api',
});

const getItems = (searchParams) => {
    return service.get('/items?' + searchParams);
};

const getOneItem = (itemId) => {
    return service.get('items/' + itemId);
};

const uploadImages = (files) => {
    return service.post('items/images', files);
};

const createItem = (itemData) => {
    return service.post('/items', itemData);
};

export { getItems, getOneItem, uploadImages, createItem };