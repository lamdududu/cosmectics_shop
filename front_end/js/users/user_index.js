// ----------------------------------------------------------------
// Tải header, footer, nav (tài khoản)
// ----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    // Tải header
    loadHeader()

    // Tải footer
    const footerHTML = await loadHTMLContent('./components/footer.txt')
    document.getElementById('footer').innerHTML = footerHTML
})

async function loadHeader() {
    
    const headerHTML = await loadHTMLContent('./components/header.txt')
    document.getElementById('header').innerHTML = headerHTML

    const token = sessionStorage.getItem('access_token')
    const navbar = document.getElementById('rightNav')

    console.log(navbar)


    // Thêm button đăng nhập/đăng ký nếu chưa đăng nhập
    if (!token) {
        const navForAccount = `
            <div class="user-dropdown dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person-circle"></i>
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li><a id="login" class="dropdown-item" href="#">Đăng nhập</a></li>
                    <li><a id="register" class="dropdown-item" href="#">Đăng ký</a></li>
                </ul>
            </div>
        `

        navbar.insertAdjacentHTML('beforeend', navForAccount)

        document.getElementById('login').onclick = () => {
            showLoginModal()
        }

        document.getElementById('register').onclick = () => {
            showRegisterModal()
        }
    }

    // Thêm button giỏ hàng/tài khoản nếu đã đăng nhập
    else {
        const navForAccount = `
           <!-- Cart Icon -->
            <div class="me-3 position-relative">
                <a href="./cart.html" class="nav-link">
                    <i class="bi bi-bag"></i>
                    ${parseFloat(sessionStorage.getItem('cart_items')) > 0 ? 
                        `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            ${sessionStorage.getItem('cart_items')}
                        </span>` : ''
                    }
                </a>
            </div>
            
            <!-- User Dropdown -->
            <div class="user-dropdown dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person-circle"></i>
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li><a class="dropdown-item" href="#">Tài khoản của tôi</a></li>
                    <li><a class="dropdown-item" href="#">Đơn hàng</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a onclick="logout()" class="dropdown-item" href="#">Đăng xuất</a></li>
                </ul>
            </div>
        `

        navbar.insertAdjacentHTML('beforeend', navForAccount)
    }
}


// Mở modal login
async function showLoginModal() {

    if (!document.getElementById('loginModal')) {
        const loginModalHTML = await loadHTMLContent('./components/login_modal.txt')
        document.body.insertAdjacentHTML('beforeend', loginModalHTML)
    }

    document.getElementById('loginModal').addEventListener('shown.bs.modal', () => {
        document.getElementById('noAccount').addEventListener('click', () => {
            const loginModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal'))
            loginModal.hide()

            showRegisterModal()
        })

        checkUsername()

        validateForm(document.getElementById('loginForm'), () => {}, login)
        
    })

    const loginModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal'))
    loginModal.show()
}


// Mở modal register
async function showRegisterModal() {
    if (!document.getElementById('registerModal')) {
        const registerModalHTML = await loadHTMLContent('./components/register_modal.txt')
        // document.body.insertAdjacentHTML('beforeend', registerModalHTML)

        const element = document.createElement('div')
        element.innerHTML = registerModalHTML

        document.body.appendChild(element)

        document.getElementById('alreadyAccount').onclick = () => {
            const registerModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('registerModal'))
            registerModal.hide()

            showLoginModal()
        }
    }

    console.log($('#provinceSignup'), $('#districtSignup'), $('#wardSignup'), $('#registerModal .modal-body'))

    $('#registerModal').on('shown.bs.modal', () => {
        
        initAddressSelector(
            $('#provinceSignup'), $('#districtSignup'), $('#wardSignup'),
            document.getElementById('provinceSignup'), document.getElementById('districtSignup'),
            document.getElementById('wardSignup'), $('#registerModal')
        )
    })

    document.getElementById('registerModal').addEventListener('shown.bs.modal', () => {
        validateForm(document.getElementById('registerForm'), validateRegisterForm, register)
    })

    const registerModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('registerModal'))
    registerModal.show()
}



// ----------------------------------------------------------------
// Hiển thị danh sách sản phẩm (product card)
// ----------------------------------------------------------------

function renderProductList(products, productListContainer) {
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('col-6', 'col-md-3', 'mb-4');
        productCard.onclick = (event) => {
            event.preventDefault();
            sessionStorage.setItem("product_id", product.id)
            window.location.href = `./product_detail.html?name=${product.name}`;
        }

        const salePrice = product.sale_price ? parseFloat(product.sale_price) : ''
        const discountPercentage = product.discount_percentage ? Math.floor(parseFloat(product.discount_percentage) * 100) : ''

        productCard.innerHTML = `
            <div class="card product-card h-100 px-2 py-3">
                <div class="d-flex justify-content-center align-items-center">
                    <img src="${product.image}" class="card-img-top" alt="Product image">
                </div>
                <div class="card-body">
                    <p class="product-brand">${product.brand}</p>
                    <h5 class="product-title">${product.name}</h5>
                    <div class="d-flex justify-content-between align-items-center">
                        <p class="product-price mb-0">
                            ${salePrice ? formatPrice(salePrice) : formatPrice(parseFloat(product.price))}
                            <span class="original-price">${salePrice ? formatPrice(parseFloat(product.price)) : ''}</span>
                        </p>
                    </div>
                </div>
            </div>
        `
        productListContainer.appendChild(productCard);
    })
}