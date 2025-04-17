document.addEventListener("DOMContentLoaded", () => {
    
    // Hiển thị thông tin sản phẩm
    renderProductInfo()

})


// Fetch dữ liệu product
async function fetchProductInfo() {
    try {
        // ${sessionStorage.getItem("product_id")}
        const response = await fetch(`http://127.0.0.1:8000/api/products/product_info/${sessionStorage.getItem("product_id")}/`, {
            'method': 'GET',
            'headers': { 'Content-Type': 'application/json'}
        })

        const data = await response.json()
        
        if (!response.ok) {
            window.location.href = './not_found.html'
        }

        console.log(data)

        return data
    }

    catch (err) { 
        console.log(err)
    }
}


// Hiển thị dữ liệu product
async function renderProductInfo() {

    const data = await fetchProductInfo()

    const product = data.product
    const variants = data.variants
    const images = data.images
    const discount_percentage = data.discount_percentage ? parseFloat(data.discount_percentage) : null

    document.getElementById('productName').textContent = product.name
    document.querySelectorAll('.productBrand').forEach( element => {
        element.innerHTML = product.brand.name
    })
    document.getElementById('productCategory').innerText = product.category.name
    document.getElementById('description').innerText = product.description

    document.getElementById('tags').innerHTML = product.tags
                                                    .map(tag => `#${tag.name.replace(/ /g, "_")}`)
                                                    .join("&emsp;");
    document.getElementById('ingredients').innerText = product.ingredients
                                                        .map(ingredient => ingredient.name)
                                                        .join(', ')  

    const variantContainer = document.getElementById('variantContainer')
    variants.forEach((variant, index) => {
        const variantButton = document.createElement('button');
        variantButton.setAttribute('data-variant-id', variant.id)
        variantButton.textContent = variant.name;
        variantButton.classList.add('btn', 'variant-btn');
        variantButton.addEventListener('click', (event) => {
            event.preventDefault();
            selectVariant(variantButton, variant, discount_percentage)
        });
        variantContainer.appendChild(variantButton);

        if (index === 0) {
            selectVariant(variantButton, variant, discount_percentage)
        }
    })

    
    const thumbnailContainer = document.getElementById('thumbnailContainer')
    images.forEach( (image, index) => {
        const img = document.createElement('img')
        img.src = image.image_file
        img.alt = product.name
        img.classList.add('thumbnail')

        thumbnailContainer.appendChild(img)

        if (index === 0) {
            const productImg = document.getElementById('productImg')
            productImg.src = image.image_file
            img.alt = product.name
            img.classList.add('active')
        }
    })

    document.getElementById('addToCartBtn').addEventListener('click', (event) => {
        event.stopPropagation

        addCartItem()
    })

    showImageThumbnail()


    // Hiển thị mã giảm giá
    renderCoupons()

    // Tải các sản phẩm tương tự
    getRelatedProducts(product)
}

function showImageThumbnail () {
    const mainImage = document.querySelector('.product-main-image');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    // Variables for zoom functionality
    const imageContainer = document.querySelector('.product-image-container');
    let isZooming = false;
    const zoomLevel = 1.5; // Zoom magnification level
    
    // Set up thumbnail click handlers
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            // Update main image source to the clicked thumbnail's source
            mainImage.src = this.src;
            
            // Remove active class from all thumbnails
            thumbnails.forEach(thumb => thumb.classList.remove('active'));
            
            // Add active class to clicked thumbnail
            this.classList.add('active');
            
            // Add a fade transition effect
            mainImage.style.opacity = '0.7';
            setTimeout(() => {
                mainImage.style.opacity = '1';
            }, 200);
        });
    });
    
    // Zoom effect on mouse hover for the main image
    if (imageContainer && mainImage) {
        // Mouse enter - start zoom capability
        imageContainer.addEventListener('mouseenter', function() {
            isZooming = true;
            mainImage.style.transition = 'transform 0.2s ease-out';
        });
        
        // Mouse move - perform zoom based on cursor position
        imageContainer.addEventListener('mousemove', function(e) {
            if (!isZooming) return;
            
            // Get container dimensions and position
            const rect = imageContainer.getBoundingClientRect();
            
            // Calculate cursor position relative to the container (0 to 1)
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            // Calculate transform values for zoom effect
            // This moves the image in the opposite direction of the mouse
            // to create a magnifying glass effect
            const transformX = (0.5 - x) * 40; // 40px max movement
            const transformY = (0.5 - y) * 40; // 40px max movement
            
            // Apply transform to the image
            mainImage.style.transform = `scale(${zoomLevel}) translate(${transformX}px, ${transformY}px)`;
        });
        
        // Mouse leave - reset zoom
        imageContainer.addEventListener('mouseleave', function() {
            isZooming = false;
            mainImage.style.transform = 'scale(1) translate(0, 0)';
        });
    }
}


// Add quantity selector functionality
const decrementBtn = document.querySelector('.quantity-btn:first-of-type');
const incrementBtn = document.querySelector('.quantity-btn:last-of-type');
const quantityInput = document.querySelector('.quantity-input');

if (decrementBtn && incrementBtn && quantityInput) {
    // Decrement quantity
    decrementBtn.addEventListener('click', function() {
        let value = parseInt(quantityInput.value);
        if (value > 1) {
            value--;
            quantityInput.value = value;
        }
    });
    
    // Increment quantity
    incrementBtn.addEventListener('click', function() {
        let value = parseInt(quantityInput.value);
        const maxStock = 24; // Based on available stock from the page
        if (value < maxStock) {
            value++;
            quantityInput.value = value;
        }
    });
    
    // Validate input to ensure it's a number between 1 and max stock
    quantityInput.addEventListener('change', function() {
        let value = parseInt(this.value);
        const maxStock = 24;
        
        if (isNaN(value) || value < 1) {
            this.value = 1;
        } else if (value > maxStock) {
            this.value = maxStock;
        }
    });
}





function changeImage(src) {
    document.getElementById('mainImage').src = src;
}

function selectVariant(button, variant, discount_percentage) {

    if (discount_percentage) {
        document.getElementById('originalPrice').innerText = formatPrice(parseFloat(variant.price))
        document.getElementById('productPrice').innerText = formatPrice(parseFloat(variant.price) - parseFloat(variant.price) * discount_percentage)
        document.getElementById('discountPercentage').innerText = '-' + Math.floor((discount_percentage*100)) + '%'
    }
    else {
        document.getElementById('productPrice').innerText = formatPrice(parseFloat(variant.price))
    }

    document.querySelectorAll('#variantContainer .btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    if (variant.stock) {
        document.getElementById('stockInfo').setAttribute('data-stock', variant.stock)
        document.getElementById('stockInfo').innerText = `${variant.stock}`;
    }
    
    else {
        document.getElementById('availabilityStatus').innerHTML = `Hết hàng`
        document.getElementById('availabilityStatus').style.color = 'var(--warning-color);'
        document.getElementById('addToCartBtn').disabled = true
        document.getElementById('buyNowBtn').disabled = true
    }

    document.getElementById('stockInfo').style.display = 'inline';

    document.getElementById('quantity').max = variant.stock
}


// ----------------------------------------------------------------
// Thêm sản phẩm vào giỏ hàng
// ----------------------------------------------------------------

async function addCartItem(event, item) {
    // event.stopPropagation();

    // console.log('cart item id:', item)

    const access_token = await getValidAccessToken()
    if (!access_token) {
        showLoginModal()
    }

    else {

        const quantity = document.getElementById('quantity').value
        const variant = document.querySelector('#variantContainer > .active').getAttribute('data-variant-id')

        fetch(`http://127.0.0.1:8000/api/carts/cart_items/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({
                // cart: parseInt(user.cart),
                variant_id: parseInt(variant),
                quantity: parseInt(quantity) || 1,
            })
        })
        .then(response => response.json())
        .then(data => {
            alert('Thêm sản phẩm vào giỏ hàng thành công!')

            const cart_items = parseInt(sessionStorage.getItem('cart_items')) - 1
            sessionStorage.setItem('cart_items', cart_items)
            
            console.log('cart:', data)
        })
        .catch(error => console.error('Error adding cart item:', error))
    }
}


document.getElementById('quantity').addEventListener('blur', () => {
    const quantity = document.getElementById('quantity')

    if (quantity.value < 1) {
        quantity.value = 1
    }

    const stock = parseInt(document.getElementById('stockInfo').getAttribute('data-stock'))
    if (quantity.value > stock) {
        quantity.value = stock
    }
})



// ----------------------------------------------------------------
// Tải sản phẩm tương tự
// ----------------------------------------------------------------

async function getRelatedProducts(product) {

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/products/product_info/?category__name__icontains=${product.category.name}&&page_size=4`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })

        if (!response.ok) {
            window.location.href = './not_found.html';
            console.log('Lỗi khi tải sản phẩm tương tự')
        }

        const data = await response.json()

        console.log(data)
    
        if (data.results.length > 0) {
            renderProductList(data.results, document.getElementById('relatedProductContainer'))
        }
        
        else {
            document.getElementById('relatedProductContainer').innerHTML = '<p class="text-note">Không tìm thấy sản phẩm tương tự</p>'
            console.log('Không tìm thấy sản phẩm tương tự')
        }
    }

    catch (error) {
        console.log('Error fetching related products:', error)
    }
}


// ----------------------------------------------------------------
// Tải mã giảm giá
// ----------------------------------------------------------------

async function fetchCoupons() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/discounts/coupons/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        
        if (!response.ok) {
            window.location.href = './not_found.html';
            console.log('Lỗi khi tải mã giảm giá')
        }

        const data = await response.json()

        console.log(data)

        return data
    }   

    catch (error) {
        console.log('Error fetching coupons:', error)
    }
}

async function renderCoupons() {
    const data = await fetchCoupons()
    console.log(data)
    if (data.length != 0) {
        const couponContainer = document.getElementById('couponContainer')
        couponContainer.classList.add('d-flex', 'flex-column')
        couponContainer.style.display = 'block'

        const ul = couponContainer.querySelector('.ul')
        data.forEach((coupon, index) => {
            if (index < 3) {
                const couponItem = document.createElement('li')
                couponItem.innerHTML = coupon.description
                
                ul.appendChild(couponItem)
            }
        })
    }
}



// -------------------------------------------------
//
// -------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const mainImage = document.querySelector('.product-main-image');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    // Variables for zoom functionality
    const imageContainer = document.querySelector('.product-image-container');
    let isZooming = false;
    const zoomLevel = 1.5; // Zoom magnification level
    
    // Set up thumbnail click handlers
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            // Update main image source to the clicked thumbnail's source
            mainImage.src = this.src;
            
            // Remove active class from all thumbnails
            thumbnails.forEach(thumb => thumb.classList.remove('active'));
            
            // Add active class to clicked thumbnail
            this.classList.add('active');
            
            // Add a fade transition effect
            mainImage.style.opacity = '0.7';
            setTimeout(() => {
                mainImage.style.opacity = '1';
            }, 200);
        });
    });
    
    // Zoom effect on mouse hover for the main image
    if (imageContainer && mainImage) {
        // Mouse enter - start zoom capability
        imageContainer.addEventListener('mouseenter', function() {
            isZooming = true;
            mainImage.style.transition = 'transform 0.2s ease-out';
        });
        
        // Mouse move - perform zoom based on cursor position
        imageContainer.addEventListener('mousemove', function(e) {
            if (!isZooming) return;
            
            // Get container dimensions and position
            const rect = imageContainer.getBoundingClientRect();
            
            // Calculate cursor position relative to the container (0 to 1)
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            // Calculate transform values for zoom effect
            // This moves the image in the opposite direction of the mouse
            // to create a magnifying glass effect
            const transformX = (0.5 - x) * 40; // 40px max movement
            const transformY = (0.5 - y) * 40; // 40px max movement
            
            // Apply transform to the image
            mainImage.style.transform = `scale(${zoomLevel}) translate(${transformX}px, ${transformY}px)`;
        });
        
        // Mouse leave - reset zoom
        imageContainer.addEventListener('mouseleave', function() {
            isZooming = false;
            mainImage.style.transform = 'scale(1) translate(0, 0)';
        });
    }
})