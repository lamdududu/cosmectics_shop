const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                    <li class="breadcrumb-item active" aria-current="page">Sản phẩm</li>
                `
            }

            if (node.id === 'sidebar') {
                document.getElementById('sidebarNav').querySelectorAll('.active').forEach(element => {
                    element.classList.remove('active')
                })
                document.getElementById('productNav').classList.add('active')
            }
        })
    })
})

observer_navbar.observe(document.body, { childList: true, subtree: true })




document.addEventListener('DOMContentLoaded', async() => {

    const page_size = 10

    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken(
        `http://127.0.0.1:8000/api/products/product_info/?page_size=${page_size}&`, 1, access_token
    )
    createPagination(paginatedData.total_pages, 1, paginatedData.count, page_size)
    renderProductList(paginatedData.results)
})

async function paginationClick(pageNumber) {
    const page_size = 10
    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken(
        `http://127.0.0.1:8000/api/products/product_info/?page_size=${page_size}&`, pageNumber, access_token
    )
    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderProductList(paginatedData.results)
}

async function paginationClick(pageNumber) {

    const page_size = 10
    const access_token = await getValidAccessToken()

    const searchingInput = document.getElementById('productSearching')

    let paginatedData

    if (!searchingInput.value || searchingInput.value.trim() === '') {
        paginatedData = await fetchPaginatedDataWithToken(
            `http://127.0.0.1:8000/api/products/product_info/?page_size=${page_size}&`, pageNumber, access_token
        )
    }

    else {
        paginatedData = await fetchPaginatedDataWithToken(
            `http://127.0.0.1:8000/api/products/product_info/?page_size=${page_size}&query=${searchingInput.value}&`, pageNumber, access_token
        )
    }

    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderProductList(paginatedData.results)
}

function renderProductList(productList) {
    var table = document.getElementById('productContainer')
    table.innerHTML = ''

    productList.forEach(product => {
        const row = document.createElement('tr');
        
        row.onclick = () => {
            navigateToProductDetail(product.id, product.name)
        }

        row.innerHTML = `
            <td>${product.id}</td>
            <td><img src="${product.image}" alt="Sản phẩm 1" class="product-image"></td>
            <td>
                <div class="fw-semibold">${product.name}</div>
            </td>
            <td>
                <div class="fw-semibold">${product.sale_price ? formatPrice(parseFloat(product.sale_price)) : formatPrice(parseFloat(product.price))}</div>
                <small class="text-decoration-line-through text-muted">${product.sale_price ? formatPrice(parseFloat(product.price)) : ''}</small>
            </td>
            <td>
                <span class="category-badge">${product.category}</span>
            </td>
            <td><span class="product-status ${product.status ? 'status-instock' : 'status-outofstock'}">${product.status ? 'Đang bán' : 'Ẩn'}</span></td>
        `;

        table.appendChild(row);

        initTooltips()
    })
}

// function viewProduct(productId, productName) {
//     window.location.href = `admin-products.html?product=${productName}`
//     sessionStorage.setItem('productID', productId)
//     sessionStorage.setItem('productName', productName)
// }

// document.getElementById('addNewProduct').addEventListener('click', () => {
//     addNewProduct()
// })

// if(sessionStorage.getItem('productID')) {
//     console.log("Product ID products: " + sessionStorage.getItem('productID'))
// }
// else { console.log("Product ID is not available")}