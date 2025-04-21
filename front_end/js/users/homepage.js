
document.addEventListener('DOMContentLoaded', async () => {

    const best_seller = await getProducts('best_seller')
    renderProductList(best_seller, document.getElementById('bestSellers'))


    const new_products = await getProducts('new')
    renderProductList(new_products, document.getElementById('newProducts'))
})



async function getProducts(query) {

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/orders/list_products/?query=${query}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })

        if (!response.ok) {
            window.location.href = './not_found.html';
            console.log('Lỗi khi tải sản phẩm')
        }

        const data = await response.json()

        console.log(data)

        return data
        
    }

    catch (error) {
        console.log('Error fetching related products:', error)
    }
}