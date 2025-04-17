// Biến tổng giá (sử dụng chung cho toàn bộ)
let totalAmount = 0

document.addEventListener("DOMContentLoaded", async () => {

    const user = JSON.parse(sessionStorage.getItem('user'));

    if (!user) {
        window.location.href = './index.html';
        return;
    }

    // Tải dữ liệu đã được phân trang từ back-end
    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken('http://127.0.0.1:8000/api/carts/cart_items/?page_size=10&&', 1, access_token)

    // Hiển thị danh sách sản phẩm
    if (paginatedData.results.length === 0) {
        document.getElementById('main').innerHTML = `
            <div class="error-not-found">
                <div class="text-center">
                    <div class="error-code" style="font-size: 4rem;">Giỏ hàng trống</div>
                    <h2 class="mb-3 error-text">Bạn chưa có gì trong giỏ hàng của mình</h2>                    
                    <a href="./products.html" class="btn btn-primary btn-custom">
                        <i class="bi bi-arrow-left"></i> Mua sắm nào
                    </a>
                </div>
            </div>
        `

        document.getElementById('checkoutCard').remove()
    }

    else {
        renderCartItemList(paginatedData.results)
    }
})


function renderCartItemList(data) {

    console.log(data)
    
    const cartItemContainer = document.getElementById('cartItemContainer')

    data.forEach((item) => {
        const cartItem = document.createElement('tr')
        cartItem.classList.add('cart-item')
        cartItem.setAttribute('data-id', item.id)

        const price = item.sale_price ? item.sale_price : item.price

        cartItem.innerHTML = `
            <td class="text-center align-middle">
                <input type="checkbox" class="item-checkbox" data-original-price="${item.sale_price ? item.price : ''}"  data-price="${price}" data-id="${item.id}">
            </td>
            <td>
                <div class="d-flex align-items-center flex-nowrap gap-3 product-td">
                    <span>
                        <img src="${item.image}" alt="Pi Pizza Oven" class="product-img">
                    </span>
                    <span class="product-name">${item.product.name}</span>
                </div>
            </td>
            <td class="text-center align-middle">
                <select class="form-select variant-select">
                    <option value="${item.variant.id}" selected>${item.variant.name}</option>
                </select>   
            </td>
            <td class="text-center align-middle price" data-price="${price}" data-original-price="${item.sale_price ? item.price : ''}">
                <span class="original-price">${item.sale_price ? formatPrice(parseFloat(item.price) * parseInt(item.quantity)) : ''}</span>
                <span class="ps-1">${formatPrice(parseFloat(price) * parseInt(item.quantity))}</span>
            </td>
            <td  class="text-center align-middle">
                <div class="d-flex justify-content-center">
                    <input type="number" class="form-control w-50 item-quantity" value="${parseInt(item.quantity)}" min="1" max="${item.variant.stock}" step="1">
                </div>
            </td>
            <td class="text-center align-middle">
                <button class="btn delete-btn btn-warning">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `

        cartItemContainer.appendChild(cartItem)

        const product = cartItemContainer.querySelector('.product-td')
        product.onclick = (event) => {
            event.preventDefault()

            navigateToProductDetail(item.product.id, item.product.name)
        }

        const deleteBtn = cartItem.querySelector('.delete-btn')
        deleteBtn.onclick = () => {
            deleteCartItem(cartItem)
        }

        const selector = cartItem.querySelector('.variant-select')
        const quantity = cartItem.querySelector('.item-quantity')
        initSelect2(selector, quantity, item.id, item.product.id)

    })


    // // Chọn tất cả sản phẩm trong giỏ hàng
    // checkAllItems(true)
    // document.getElementById("selectAll").checked = true

    // Tính tổng tiền
    updateTotalAmount(getSelectedCheckboxList())

    initTooltips()
}





// -----------------------------------------------------------------
// Lấy phân loại cho từng sản phẩm
// ----------------------------------------------------------------

function getOptionForSelector(selector, api) {
    
    fetch(api, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {       
        data.forEach(element => {
            const option = document.createElement('option');
            option.value = element.id;
            option.innerHTML = `${element.name}`;
            selector.appendChild(option);
        });
    })
    .catch(error => console.error('Error fetch data:', error))
}

function initSelect2(selector, quantity, cartItemID, productID) {
    $(selector).select2({
        placeholder: 'Select a variant',
        // allowClear: true,
        minimumResultsForSearch: Infinity,
        width: '100%'
    })

    getOptionForSelector(selector, `http://127.0.0.1:8000/api/products/variants/?product=${productID}`)

    $(selector).on('change', async function() {
        updateCartItem(null, cartItemID, $(this).val())

        const cartItem = selector.closest('tr')

        const price_data = await getPriceOfVariant($(this).val())

        const priceElement = cartItem.querySelector('.price')

        const price = price_data.sale_price ? parseFloat(price_data.sale_price) : parseFloat(price_data.price)

        priceElement.innerHTML = `
            <span class="original-price">${price_data.sale_price ? formatPrice(parseFloat(price_data.price) * parseInt(quantity.value)) : ''}</span>
            <span class="ps-1">${formatPrice(parseFloat(price) * parseInt(quantity.value))}</span>
        `

        priceElement.setAttribute('data-price', price)

        if (price_data.sale_price) {
            priceElement.setAttribute('data-original-price', price_data.price)
        }

        cartItem.querySelector('input[type=checkbox]').setAttribute('data-price', price)

        if (price_data.sale_price) {
            cartItem.querySelector('input[type=checkbox]').setAttribute('data-original-price', price_data.price)
        }

        updateTotalAmount(getSelectedCheckboxList())
        
    })
}


// ----------------------------------------------------------------
// Thao tác với cart items
// ----------------------------------------------------------------


async function updateCartItem(quantity, cartItemID, variantID) {
    const accessToken = await getValidAccessToken()
    const field = quantity ? 'quantity' : 'variant_id'
    fetch(`http://127.0.0.1:8000/api/carts/cart_items/${cartItemID}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            [field]: quantity ? parseInt(quantity) : parseInt(variantID)
        })
    })
   .then(response => response.json())
}

async function getPriceOfVariant(variantID) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/carts/update_price_for_cart_item/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                variant: variantID
            })
        })
        const priceData = await response.json()

        console.log(priceData)

        if (priceData)
            return priceData
    }

    catch (error) {
        console.error('Error fetch data:', error)
    }
}


async function deleteCartItem(cartItem) {
    const cartItemID = cartItem.getAttribute('data-id')
    const accessToken = await getValidAccessToken()

    fetch(`http://127.0.0.1:8000/api/carts/cart_items/${cartItemID}/`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => {
        if (response.ok) {
            cartItem.remove()
            
            const cart_items = parseInt(sessionStorage.getItem('cart_items')) - 1
            sessionStorage.setItem('cart_items', cart_items)

        } else {
            console.error(`Error deleting cart item: ${response.status}`)
        }
    })
    .catch(err => console.error(err))
}


// ----------------------------------------------------------------
// Thay đổi lựa chọn trong giỏ hàng
// ----------------------------------------------------------------


// document.getElementById('cartItemContainer').addEventListener('change', function(event) {

//     // theo dõi input số lượng
//     if (event.target.matches('input[type="number"]')) {

//         const cartItems = document.querySelectorAll('#cartItemContainer > tr input[type="number"]')
//         let sumItem = 0
//         cartItems.forEach(item => sumItem += parseInt(item.value))

//         document.getElementById('sumQuantity').innerHTML = sumItem
//     }
// })
document.addEventListener('change', (event) => {

    // Thay đổi giá được hiển thị sau khi tăng giảm số lượng
    if (event.target.matches('input[type="number"]')) {

        const cartItem = event.target.closest('.cart-item')

        if (!cartItem) return

        // Lấy số lượng
        const quantity = parseInt(event.target.value)

        // Lấy id của cart item
        const cartItemID = cartItem.getAttribute('data-id')

        // Cập nhật lại số lượng item trong DB
        updateCartItem(quantity, cartItemID, null)

        // Cập nhật lại hiển thị giá tiền của sản phẩm (giá * số lượng)

        const price = parseFloat(cartItem.querySelector('.price').getAttribute('data-price'))
        const original_price = parseFloat(cartItem.querySelector('.price').getAttribute('data-original-price'))
        cartItem.querySelector('.price').innerHTML = `
            <span class="original-price">${original_price ? formatPrice(original_price * quantity) : ''}</span>
            <span class="ps-1">${formatPrice(price * quantity)}</span
        `

        updateTotalAmount(getSelectedCheckboxList())
    }


    // Thay đổi tổng tiền sau khi chọn/bỏ chọn sản phẩm trong giỏ hàng
    if (event.target.matches('input[type="checkbox"]')) {
        const selectedCheckboxes = getSelectedCheckboxList()
        console.log('Checkboxes: ', selectedCheckboxes)

        // Tính lại tổng tiền
        updateTotalAmount(selectedCheckboxes)
    }


    // Thay đổi địa chỉ hiển thị khi chọn địa chỉ khác
    if (event.target.matches('input[name="address"]')) {
        showSelectedAddress()
    }
})


// Chọn tất cả item trong giỏ hàng
document.getElementById("selectAll").addEventListener("change", function(event) {
    checkAllItems(event.currentTarget.checked)
});

function checkAllItems(checked) {
    const checkboxes = document.querySelectorAll(".item-checkbox");
    checkboxes.forEach(checkbox => 
        checkbox.checked = checked
    );
}

function getSelectedCheckboxList() {
    return Array.from(document.querySelectorAll('.item-checkbox:checked'))
}


// ----------------------------------------------------------------
// Tính tổng giá tiền sau mỗi lần thay đổi lựa chọn sản phẩm trong giỏ hàng
// ----------------------------------------------------------------

function updateTotalAmount(selectedCheckboxList) {
    console.log('đã gọi change')
    totalAmount = 0

    selectedCheckboxList.forEach(item => {
        const itemParent = item.closest('tr')
            // lấy giá và số lượng của row
        const price = parseFloat(itemParent.querySelector('.price').getAttribute('data-price'))
        const quantity = parseInt(itemParent.querySelector('.item-quantity').value)


        if (item.checked) {
            totalAmount += price * quantity
        }
    })

    console.log("Total amount: " + totalAmount)

    document.querySelectorAll('.total-amount').forEach(element => {
        element.innerHTML = formatPrice(totalAmount)
    })

    document.getElementById('totalAmount').setAttribute('data-amount', totalAmount)
}


// ----------------------------------------------------------------
// Theo dõi footer để ẩn thanh checkout (để không bị mất thông tin footer)
// ----------------------------------------------------------------

let isLoading = false
let debounceTimer

// Trang hiện tại
let currentPage = 1

const observer_checkout = new IntersectionObserver( (entries, observer) =>  {

    console.log("Đang quan sát")

    // Theo dõi footer để ẩn thanh checkout
    if (entries[0].isIntersecting) {
        document.getElementById('checkoutCard').style.display = 'none'
    }

    else document.getElementById('checkoutCard').style.display = 'block'

}, { threshold: 1.0 })

observer_checkout.observe(document.getElementById('footer'))



//
const observer_cart_items = new IntersectionObserver( (entries, observer) => {
    // Tải thêm sản phẩm mới trước khi footer vào viewport
    if (entries[0].boundingClientRect.top < window.innerHeight && !isLoading) {
        console.log("Đã thấy footer")

        // đánh dấu trang đang tải dữ liệu
        isLoading = true
        console.log("Loading...")
        currentPage++   
        
        // Hiện loading
        document.getElementById('loading-indicator').classList.add('show')

        clearTimeout(debounceTimer); // Xóa timer cũ
        debounceTimer = setTimeout( async () => {
            try {

                const access_token = await getValidAccessToken()
                const paginatedData = await fetchPaginatedDataWithToken('http://127.0.0.1:8000/api/carts/cart_items/?page_size=10&&', currentPage, access_token);

                if (paginatedData && paginatedData.results) {
                    renderCartItemList(paginatedData.results);

                }

                if (!paginatedData || !paginatedData.next) {
                    console.log("Không còn dữ liệu, dừng observer.");
                    observer.disconnect();

                    // Xóa loading sau khi đã tải toàn bộ dữ liệu
                    document.getElementById('loading-indicator').remove();
                }
            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
            } finally {
                // Ẩn loading và đánh dấu là đã xong
                setTimeout ( () => {
                    document.getElementById('loading-indicator').classList.remove('show');
                    isLoading = false;
               }, 400)
            }  
        }, 400);

        // isLoading = false
        console.log("Completed")
    }
}, {threshold: 0.2})

observer_cart_items.observe(document.getElementById('footer'))