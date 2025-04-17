
// Khởi tạo tooltip
function initTooltips() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))

    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
}

// Tải vào DOM các components html
async function loadHTMLContent(htmlFile) {
    try {
        const response = await fetch(htmlFile)
        const html = await response.text()
        return html
    }

    catch (error) {
        console.error('Error loading content:', error)
    }
}


// ----------------------------------------------------------------
// Lấy access token xác thực
// ----------------------------------------------------------------

// Kiểm tra access token đã hết hạn
function isTokenExpired(token) {
    if (!token) return

    try {
        const payload = JSON.parse(atob(token.split('.')[1]))   // decode JWT payload
        
        return payload.exp < Math.floor(Date.now() / 1000)      // so sánh thời gian hiện tại
    }

    catch (error) {
        return true             // nếu có lỗi => token không hợp lệ hoặc hết hạn
    }
}


// Lấy acccess token mới
async function refreshAccessToken() {
    const refreshToken = sessionStorage.getItem('refresh_token')
    if (!refreshToken) return

    try {
        const response = await fetch('http://127.0.0.1:8000/api/users/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh: refreshToken,
            })
        })

        if (!response.ok)
            throw new Error("Failed to refresh token.")

        const data = await response.json()

        sessionStorage.setItem('access_token', data.access)

        if (data.refresh) {
            sessionStorage.setItem('refresh_token', data.refresh)
        }

        return data.access
    }
    
    catch (error) {
        console.error("Failed to refresh token:", error)
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('refresh_token')
        sessionStorage.removeItem('user')

        window.location.href = '../users/index.html' || './index.html'
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại')
    }
}


async function getValidAccessToken() {
    let accessToken = sessionStorage.getItem('access_token')
    if (!accessToken || await isTokenExpired(accessToken)) {
        console.log('Access token expired. Refreshing...')
        accessToken = await refreshAccessToken()
    }
    return accessToken
}


// ----------------------------------------------------------------
// Lấy dữ liệu có phân trang
// ----------------------------------------------------------------
async function fetchPaginatedData(baseAPI, pageNumber) {
    try {
        const response = await fetch(`${baseAPI}page=${pageNumber}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })

        const data = await response.json()
        return data
    }

    catch (e) { console.log(e) }
}

async function fetchPaginatedDataWithToken(baseAPI, pageNumber, access_token) {
    try {
        const response = await fetch(`${baseAPI}page=${pageNumber}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            }
        })

        const data = await response.json()
        return data
    }

    catch (e) { console.log(e) }
}


// ----------------------------------------------------------------
// Format dữ liệu
// ----------------------------------------------------------------

// Xử lý giá trước khi hiển thị
function formatPrice(price) {
    const formattedPrice = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(price)

    return formattedPrice
}

// Xử lý ISO datetime sang dạng datetime dễ đọc
function formatISODate(isoString) {
    const date = new Date(isoString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Tháng bắt đầu từ 0
    const day = String(date.getDate()).padStart(2, "0");

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12; // Đổi về 12 giờ thay vì 24 giờ

    return `${year}-${month}-${day} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

// Xử lý ISO 8601 sang datetime-local (để hiển thị vào input datetime-local)
function parseDateTimeLocal(input) {

    // Chuyển từ iso 8601 sang datetime-local
    const date = new Date(input);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}


// ----------------------------------------------------------------
// Xác thực dữ liệu đầu vào
// ----------------------------------------------------------------

// Xác thực dữ liệu của form
function validateForm(form, validateData, submitEvent) {
    form.addEventListener('submit', function(event) {
        
        event.preventDefault()
        validateData()

        if (!form.checkValidity() ) {
            event.preventDefault()
            event.stopPropagation()
        }

        else {
            event.preventDefault()
            event.stopPropagation()

            submitEvent()  
            
            delete form.dataset.submitted
        }
        
        form.classList.add('was-validated')
    }, false)
}


// Xác thực dữ liệu của selector
function validateSelector(selector) {
    if (selector.val() === "") {
        if(selector.hasClass('is-valid')) {
            selector.removeClass('is-valid')
        }
        selector.addClass('is-invalid')
    }
    else {
        if(selector.hasClass('is-invalid')) {
            selector.removeClass('is-invalid')
        }
        selector.addClass('is-valid')
    }
}



// ----------------------------------------------------------------
// Lấy dữ liệu cho selector
// ----------------------------------------------------------------

function getOptionForSelector(selectorID, api) {
    
    fetch(api, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        var selector = document.getElementById(selectorID)
        
        if (data) {
            data.forEach(element => {
                const option = document.createElement('option');
                option.value = element.id;
                option.innerHTML = `${element.name}`;
                selector.appendChild(option);
            });
        }
    })
    .catch(error => console.error('Error fetch data:', error))
}


// ----------------------------------------------------------------
// Kiểm tra dữ liệu đã tồn tại
// ----------------------------------------------------------------

async function checkCouponCode(code) {
    try {
        const access_token = await getValidAccessToken()

        const response = await fetch(`http://127.0.0.1:8000/api/discounts/check_coupons/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({ code: code })
        })

        const result = await response.json()
        
        return result.exists
    }

    catch (e) {
        console.error(e)
        return false
    }
}

async function checkUserData(user_data, data_type) {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/users/check_user_data/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // key động
                [data_type]: user_data,
            })
        })
        
        const data = await response.json();
        console.log(data)
        return data.exists
    }

    catch (error) {
        console.error('Error:', error);
    }
}

// ------------------------------------------------------------
// Tìm kiếm
// ------------------------------------------------------------


document.addEventListener('change', (event) => {

})


//----------------------------------------------------------------
// Tạo slider hiển thị hình ảnh được tải lên của products (có thumbnails)
//----------------------------------------------------------------

let sliderIndex = 0

function plusSlides(n) {
    sliderIndex += n

    showSlides(sliderIndex)
}

function currentSlide(n) {
    sliderIndex = n
    showSlides(sliderIndex)
}

function moveThumbnails(n) {
    const thumbnail_container = document.getElementById('thumbnails')
    thumbnail_container.scrollLeft += n * 100;
}

function scrollThumbnailsToActive() {
    const thumbnails = document.getElementsByClassName("demo")
    const activeThumbnail = document.querySelector(".demo.active")

    if(activeThumbnail) {
        const thumbnail_container = document.getElementById('thumbnails')
        thumbnail_container.scrollLeft = activeThumbnail.offsetLeft - (thumbnail_container.clientWidth / 2) + (activeThumbnail.clientWidth / 2)
    }
}

function showSlides(n) {
    let i
    let slides = document.getElementsByClassName("slider-img")
    let thumbnails = document.getElementsByClassName("demo")
    
    if (n >= slides.length) { sliderIndex = 0 }
    else if (n < 0) { sliderIndex = slides.length - 1 }
    else { sliderIndex = n }

    for (let slide of slides) {
        slide.style.display = "none"
    }

    for (let thumbnail of thumbnails) {
        thumbnail.classList.remove("active")
    }

    slides[sliderIndex].style.display = "block"
    thumbnails[sliderIndex].classList.add("active")

    scrollThumbnailsToActive()
}


function showImageInSlider(imageFiles) {
    const slider = document.getElementById('slider-product-container')
    const thumbnails = document.getElementById('thumbnails')

    document.querySelectorAll('.slider-img').forEach(element => element.remove())

    thumbnails.innerHTML = ''

    const imagesPromise = imageFiles.map(file => {
        return new Promise((resolve) => {
            if(typeof file === 'string') {
                // console.log("Image:", file)
                resolve({src: file})
            }
            else {
                const reader = new FileReader()
                reader.onload = (e) => resolve({src: e.target.result})
                reader.readAsDataURL(file)
            }
        })
    })

    Promise.all(imagesPromise).then(images => {
        images.forEach((src, index) => {
            const img_container = document.createElement('div')
            img_container.classList.add('slider-img')
            slider.insertBefore(img_container, document.getElementById('thumbnail-container'))

            const img_number = document.createElement('div')
            img_number.innerHTML = (index + 1) + '/' + (images.length)
            img_number.classList.add('numberText')
            img_container.appendChild(img_number)

            const img_d = document.createElement('div')
            img_d.classList.add('d-flex', 'justify-content-center', 'align-items-center')
            img_d.style.backgroundColor = 'white;'
            img_container.appendChild(img_d)

            const img = document.createElement('img')
            img.classList.add('product-img')
            img.src = src.src
            img_d.appendChild(img)


            const thumbnail_container = document.createElement('div')
            thumbnail_container.classList.add('column')
            thumbnails.appendChild(thumbnail_container)

            const thumbnail_img = document.createElement('img')
            thumbnail_img.src = src.src
            thumbnail_img.classList.add('demo', 'cursor')
            thumbnail_img.onclick = () => {
                currentSlide(index)
            }
            thumbnail_container.appendChild(thumbnail_img)

            if(index === 0) {
                showSlides(sliderIndex)
            }
        })     
    })
}

