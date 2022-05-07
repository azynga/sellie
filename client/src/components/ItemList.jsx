import React, { useContext } from 'react';
import { SearchContext } from '../App';
import LoadButton from './LoadButton';
import Item from './Item';

const ItemList = ({ items }) => {
    const { searchParams } = useContext(SearchContext);
    const endOfResults = items.length < parseInt(searchParams.get('limit'));

    const itemList = items?.map((item) => {
        return <Item key={item._id} item={item} />;
    });

    return (
        <div className='item-list col'>
            {itemList}
            {endOfResults ? '' : <LoadButton items={items} />}
        </div>
    );
};

export default ItemList;
