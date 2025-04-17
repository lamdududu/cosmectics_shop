// window.addEventListener('beforeunload', () => {
//     sessionStorage.removeItem('product_id')
// })

if(sessionStorage.getItem('product_id')) {
    console.log("Product ID products: " + sessionStorage.getItem('product_id'))
}
else { console.log("Product ID is not available")}


let variantsOfNewProduct = []               // biến lưu các variants được nhập cho product mới 


const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                    <li class="breadcrumb-item"><a href="./product_list.html">Sản phẩm</a></li>
                    <li class="breadcrumb-item active" aria-current="page">Chi tiết sản phẩm</li>
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


//----------------------------------------------------------------
// Tải submit button
//----------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("productFormSubmitBtn")

    if (sessionStorage.getItem("product_id") !== 'new_product') {
        btn.setAttribute('data-action', 'updateProduct')
        btn.innerHTML = '<i class="bi bi-floppy"></i><span> Lưu chỉnh sửa</span>'

        renderProduct()
    }

    else {
        btn.setAttribute('data-action', 'createProduct')
        btn.innerHTML = '<i class="bi bi-plus"></i><span> Tạo sản phẩm</span>'
        createVariantOfNewProduct()
    }
})


//----------------------------------------------------------------
// Lấy và hiển thị dữ liệu cho các selector
//----------------------------------------------------------------


function showSelector2(selectorID, placeholder, api) {
    $(selectorID).select2({
        placeholder: placeholder,
        allowClear: true,

        // Cho phép tạo thẻ mới
        tags: true,

    });


    // Đảm bảo thứ tự các option được chọn không bị thay đổi (quan trọng đối với bảng thành phần)
    $(selectorID).on("select2:select", function(evt) {

        console.log("Sự kiện đã được gọi")

        // Tạo thẻ mới nếu chưa tồn tại (lưu vào cơ sở dữ liệu)
        handleTagSelect(evt, api, selectorID);
        
        var element = evt.params.data.element;
        var $element = $(element);
        
        $element.detach();
        $(this).append($element);
        $(this).trigger("change");

    })

}

getOptionForSelector('productBrand', 'http://127.0.0.1:8000/api/products/brands/')

getOptionForSelector('productCategory', 'http://127.0.0.1:8000/api/products/categories/')

getOptionForSelector('productIngredients', 'http://127.0.0.1:8000/api/products/ingredients/')

getOptionForSelector('productTags', 'http://127.0.0.1:8000/api/products/tags/')

$(document).ready( () => {
    showSelector2('#productBrand', 'Chọn thương hiệu sản phẩm', 'http://127.0.0.1:8000/api/products/brands/')
    showSelector2('#productCategory', 'Chọn danh mục sản phẩm', 'http://127.0.0.1:8000/api/products/categories/')
    showSelector2('#productIngredients', 'Chọn danh sách thành phần', 'http://127.0.0.1:8000/api/products/ingredients/')
    showSelector2('#productTags', 'Chọn tag sản phẩm', 'http://127.0.0.1:8000/api/products/tags/')

    $('#productStatus').select2({
        allowClear: true,
        placeholder: 'Chọn trạng thái sản phẩm',
        minimumResultsForSearch: 3          // chỉ hiển thị khung search khi có 3 option trở lên (ở tình huống này dùng để tắt khung search vì chỉ có 2 option)
    })
})

//----------------------------------------------------------------
// Tạo các textbox để nhập và lưu dữ liệu mới (phân loại, thành phần, tag)
//----------------------------------------------------------------

function handleTagSelect(evt, api, selectorID) {

    if(evt.params && evt.params.data) {
        console.log("Đã kiểm tra evt.params.data: ", evt.params.data)

        // Lấy thẻ mới được chọn
        const selectedTag = evt.params.data.text
        const selectedValue = evt.params.data.id

        // Không cần kiểm tra thẻ mới vì được back-end xử lý
        // Sửa lại sau khi hoàn thành front-end
        // contains() sẽ kiểm tra tương đối (vd: khi có ABCDEF, thì không thể thêm ABCD)
        const listOfAvailableOptions = $(evt.target).find("option:contains('" + selectedTag + "')")

        if((listOfAvailableOptions.length === 1) && (selectedValue === selectedTag)) {
            console.log("Đây là thẻ mới: ", $(listOfAvailableOptions[0]).text())
            showModalToConfirmEvent(
                listOfAvailableOptions,
                api,
                selectedTag,
                selectorID,
                true,
            )
        }

        else if((listOfAvailableOptions.length > 1) && (selectedValue === selectedTag)){
            showModalToConfirmEvent(
                listOfAvailableOptions,
                api,
                selectedTag,
                selectorID,
                false
            )
        }
    }
    else {
        console.log('Invalid event parameters')
    }
}

function createNewTagSelectInput(api, selectedTag, selectorID) {
    fetch(api, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({name: selectedTag})
    })
    .then(response => {

        // Kiểm tra nếu API response lỗi (HTTP 409 (Conflict) - Thẻ đã tồn tại)
        if(response.status === 409) {
            console.error('Error fetch data:', error)
        }

        $(selectorID).trigger('change')

        return response.json()
    })
    .then(data => {
        console.log("Thêm thẻ mới thành công: ", data)
        
        const newOption = new Option(data.name, data.id)
        console.log("New Option: ", newOption)

        // lấy (danh sách) value (giá trị các option đã chọn) của selector
        let selected = $(selectorID).val()

        // kiểm tra nếu selector là một select multiple (nhiều lựa chọn)
        if($(selectorID).prop('multiple')) {

            // ép kiểu về mảng để tránh trường hợp trình duyệt trả về giá trị khác thay vì mảng
            // nếu val() là null thì gán [] để tránh lỗi
            selected = Array.isArray(selected) ? selected : selected ? [selected] : []

            selected.pop()

            // thêm option value mới vào mảng
            selected.push(newOption.value)
        }

        // nếu selector không phải là select multiple
        else {
            selected = newOption.value
        }

        // cập nhật lại selector với option mới
        $(selectorID).append(newOption).val(selected).trigger('change')

        console.log("Selector value: ", $(selectorID).val())
    })
    .catch(error => console.error('Error fetch data:', error))
}

function showModalToConfirmEvent(listOfAvailableOptions, api, selectedTag, selectorID, unavailableOption) {

    // Chèn option mới được thêm vào warnings
    // Xóa nội dung trước đó
    const newOptions = document.getElementById('new-option')
    newOptions.innerHTML = ''

    const newOption = document.createElement('b')
    newOption.textContent = selectedTag
    
    newOptions.appendChild(newOption)


    // Chèn danh sách option có sẵn tương tự với option mới
    
    const availableOptionContainer = document.getElementById('available-option-container')
    const availableOptions = document.getElementById('available-options')
    availableOptions.innerHTML = ''

    if(unavailableOption) {
        if(availableOptionContainer.style.display != 'none') {
            availableOptionContainer.style.display = 'none'
            // availableOptionContainer.disabled = true
    
        }
    }

    else {
        if(availableOptionContainer.style.display != 'block') {
            // availableOptionContainer.disabled = false
            availableOptionContainer.style.display = 'block'
        }

        $(listOfAvailableOptions).each(function(index, option) {

            if($(option).text() !== selectedTag) {
                const availableOption = document.createElement('span')
    
                if(index != 0) {
                    availableOption.textContent = ", "
                }
    
                availableOption.textContent += $(option).text()
        
                availableOptions.appendChild(availableOption)
            }
        })
    }

    var saveButton = document.getElementById('save-tag-btn')
    saveButton.onclick = function() {
        createNewTagSelectInput(api, selectedTag, selectorID)
        confirmModalForCreateNewTagSelect.hide()
    }

    var cancelButton = document.getElementById('cancel-saving-tag-btn')
    cancelButton.onclick = function() {
        $(selectorID).trigger('change')
        confirmModalForCreateNewTagSelect.hide()
    }

    var confirmModalForCreateNewTagSelect = new bootstrap.Modal(document.getElementById('newTagModal'))

    confirmModalForCreateNewTagSelect.show()
}



//----------------------------------------------------------------
// Lấy thông tin chi tiết của một product (chưa bao gồm thông tin của variant)
//----------------------------------------------------------------

async function fetchProduct() {

    const product_id = sessionStorage.getItem('product_id')

    // if(!product_id) {
    //     alert('Không tìm thấy sản phẩm. Điều này có thể xảy ra khi bạn cố tải lại trang.')
    //         window.location.href = './admin-product-list.html'
    // }

    const access_token = await getValidAccessToken()
    
    if (product_id !== 'new_product') {
        if (product_id) {

            const response = await fetch(`http://127.0.0.1:8000/api/products/product_info/${product_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`
                }
            })

            const data = await response.json()
            
            return data
        }
    }
}

async function renderProduct() {

    const data = await fetchProduct()

    const product = data.product

    console.log(product)
    
    document.getElementById('productName').value = product.name
        
    document.getElementById('productBrand').value = product.brand.id
    $('#productBrand').trigger('change')

    document.getElementById('productStatus').value = product.status ? 1 : 2
    $('#productStatus').trigger('change')

    document.getElementById('productCategory').value = product.category.id
    $('#productCategory').trigger('change')

    $('#productIngredients').val(product.ingredients.map(ingredient => ingredient.id))
    $('#productIngredients').trigger('change')

    $('#productTags').val(product.tags.map(tag => tag.id))
    $('#productTags').trigger('change')

    document.getElementById('productDescription').value = product.description

    const variants = data.variants

    console.log(variants)

    variants.forEach(variant => {
        createVariantBtn(variant)
    })

    const images = data.images.map(image => image.image_file)
    console.log('Images:', images)
    sessionStorage.setItem('images', true)
    showImageInSlider(images)
}



// ----------------------------------------------------------------
// Kiểm tra input
// ----------------------------------------------------------------

function validateDataFromProductForm() {
    
    if(document.getElementById("productFormSubmitBtn").getAttribute('data-action') === 'createProduct') {
        validateImages()
    }

    validateSelector($('#productBrand'))
    validateSelector($('#productCategory'))
    validateSelector($('#productIngredients'))
    validateSelector($('#productTags'))

    const variantSelector = $('#productVariants')
    console.log('variantsOfNewProduct.length: ', variantsOfNewProduct.length)
    if (variantsOfNewProduct.length > 0) {
        if(variantSelector.hasClass('is-invalid')) {
            variantSelector.removeClass('is-invalid')
        }
        variantSelector.addClass('is-valid')
        return true
    }
    else {
        if(variantSelector.hasClass('is-valid')) {
            variantSelector.removeClass('is-valid')
        }
        variantSelector.addClass('is-invalid')
        return false
    }
}

function validateImages() {
    const imgInput = document.getElementById('productImages')
    if (imgInput.files.length < 1 && !sessionStorage.getItem('images')) {
        if(imgInput.classList.contains('is-valid')) {
            imgInput.classList.remove('is-valid')
        }
        imgInput.classList.add('is-invalid')
    }

    else {
        if(imgInput.classList.contains('is-invalid')) {
            imgInput.classList.remove('is-invalid')
        }
        imgInput.classList.add('is-valid')
    }
}

document.getElementById('productDescription').addEventListener('input', () => {
    document.getElementById('productDescription').style.height = 'auto'
    document.getElementById('productDescription').style.height = `${document.getElementById('productDescription').scrollHeight}px`
})


document.getElementById('productName').addEventListener('blur', async () => {
    const productName = document.getElementById('productName')

    if(productName.value.trim() === '') {
        productName.classList.add('is-invalid')
    }
    else {
        
        const response = await fetch('http://127.0.0.1:8000/api/products/check_product_name/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({name: productName.value.trim()})
        })

        const data = await response.json()

        console.log(data)

        if (data.exists) {
            if (sessionStorage.getItem('product_id') !== 'new_product') {
                if (productName.value == sessionStorage.getItem('productName')) {
                    if(productName.classList.contains('is-invalid')) {
                        productName.classList.remove('is-invalid')
                    }
                    productName.classList.add('is-valid')
                }
            }
            
            else {
                if(productName.classList.contains('is-valid')) {
                    productName.classList.remove('is-valid')
                }
                productName.classList.add('is-invalid')
                productName.nextElementSibling.innerHTML = 'Sản phẩm đã tồn tại'
            }
        }

        else {
            if(productName.classList.contains('is-invalid')) {
                productName.classList.remove('is-invalid')
            }
            productName.classList.add('is-valid')
        }
    }
})



// ----------------------------------------------------------------
// Thao tác trên product
// ----------------------------------------------------------------

// Lấy thông tin sản phẩm
function getDataFromProductForm() {
    const formData = new FormData()

    const variants = variantsOfNewProduct.map(variant => ({
        name: variant
    }))

    const product = {
        name: (document.getElementById('productName').value).trim(),
        brand_id: parseInt($('#productBrand').val()),
        category_id: parseInt($('#productCategory').val()),
        ingredient_ids: $('#productIngredients').val().map(id => parseInt(id)),
        tag_ids: $('#productTags').val().map(id => parseInt(id)),
        description: (document.getElementById('productDescription').value).trim(),
        status: parseInt($('#productStatus').val()) === 1 ? true : false
    }

    const data = new FormData()

    data.append("product", JSON.stringify(product))

    if(document.getElementById("variantSelector")) {
        data.append("variants", JSON.stringify(variants))
    }

    Array.from(document.getElementById('productImages').files).forEach(file => {
        data.append('images', file)
    })

    return data
}


// Tạo sản phẩm mới
async function createProduct() {
    
    const data = getDataFromProductForm()

    const access_token = await getValidAccessToken()

    console.log('Dữ liệu form:', data)

    fetch('http://127.0.0.1:8000/api/products/product_detail/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${access_token}`
        },
        body: data
    })
   .then(response => {
        if (response.ok) {
            return response.json()
        } else {
            throw new Error('HTTP error! status: ', response.status)
        }
   })
   .then (productData => {
        alert('Sản phẩm mới đã tạo thành công!')
        window.location.href = `./admin-products.html?id=${productData.name}`
        sessionStorage.setItem('product_id', productData.id)
        sessionStorage.setItem('productName', productData.name)
    })
    .catch(error => console.error('Error:', error))
}


// Cập nhật sản phẩm
async function updateProduct() {
    const data = getDataFromProductForm()

    console.log('Product:', data.product)
    console.log('Image:', data.image)
    console.log('Varriant:', data.varriant)

    const product_id = sessionStorage.getItem('product_id')

    if(!product_id) {
        console.error('Product ID does not exist')
        return
    }

    const access_token = await getValidAccessToken()

    fetch(`http://127.0.0.1:8000/api/products/product_detail/${product_id}/`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${access_token}`
        },
        body: data
    })
    .then(response => {
        if (response.ok) {
            return response.json()
        } else {
            console.error('API response failed: ', error)
        }
    })
    .then(product => {
        console.log("Update:", product)
        sessionStorage.setItem('product_id-update', product.id)
        sessionStorage.setItem('productName', product.name)
        alert('Sản phẩm đã cập nhật thành công!')
        window.location.reload()
    })
    .catch(error => console.error('Error:', error))
}


validateForm(document.getElementById('productForm'), validateDataFromProductForm, submitProductForm)

function submitProductForm() {

    const action = document.getElementById('productFormSubmitBtn').getAttribute('data-action')
    
    if(action === 'updateProduct') {
        updateProduct()
        console.log('update success');
    }

    else if (action === 'createProduct') {
        createProduct()
        console.log('create success');
    }
};


//----------------------------------------------------------------
// Tạo variants
//----------------------------------------------------------------

// Tạo variants cho product mới
function createVariantOfNewProduct() {
    if(sessionStorage.getItem('product_id') === 'new_product') {
        document.getElementById('variantContainer').innerHTML = '';

        const selectedVariant = document.createElement('select')
        selectedVariant.id = 'variantSelector'
        selectedVariant.classList.add('form-select')
        // selectedVariant.style.backgroundColor = "var(--secondary-color);"
        selectedVariant.multiple = true

        const validVariant = document.createElement('div')
        validVariant.classList.add('invalid-feedback')
        validVariant.innerHTML = "Vui lòng nhập ít nhất một phân loại cho sản phẩm"
        

        document.getElementById('variantContainer').appendChild(selectedVariant)
        document.getElementById('variantContainer').appendChild(validVariant)

        // const option = document.createElement('option')
        // option.innerHTML = 'Nhập các phân loại của sản phẩm'
        // selectedVariant.appendChild(option)

        $('#variantSelector').select2({
            placeholder: 'Nhập các phân loại của sản phẩm',
            tags: true,
            tokenSeparator: [',', ' '],
            dropdownCssClass: 'hidden',
            create: (params) => {
                const term = $.trim(params.term)
                if(term && !variantsOfNewProduct.includes(term)) {
                    variantsOfNewProduct.push(term)
                    return {id: term, text: term, newTag: true}
                }
            }
        })

        $('#variantSelector').on('change', function() {
            const currentVariants = $(this).val() || []
            
            // const removedTags = variantsOfNewProduct.filter(tag => !currentVariants.includes(tag))

            variantsOfNewProduct = currentVariants

            console.log('Variants of new product: ', variantsOfNewProduct)
        })
    }
}

// Tạo variants cho product đã có trước đó
function createVariantBtn(variant) {

    if (document.getElementById('variantContainer')) {
        const variantBtn = document.createElement('button')

        variantBtn.classList.add('btn', 'btn-secondary');
        variantBtn.innerHTML = variant.name;
        variantBtn.dataset.id = variant.id;
        variantBtn.onclick = function (event) {
            getVariantDetails(event, this.dataset.id)
        }

        const addBtn = document.getElementById('addVariantBtn')
        if(addBtn) {
            document.getElementById('variantContainer').insertBefore(variantBtn, addBtn)
        }
    }
}



//----------------------------------------------------------------
// Hiển thị chi tiết variant (sidebar)
//----------------------------------------------------------------

function toggleVariantSidebar() {
    document.getElementById('variantSidebar').classList.toggle('show');
    document.getElementById('productFormSubmitBtn').classList.toggle('hidden');
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        document.getElementById('variantSidebar').classList.remove('show');
        document.getElementById('productFormSubmitBtn').classList.remove('hidden');
    }
})

function scrollToTop() {
    document.getElementById('variantSidebar').scrollTop = 0;
}

function getVariantDetails(event, id) {

    event.preventDefault()

    if(id) {
        fetch(`http://127.0.0.1:8000/api/products/variant_detail/${id}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
       .then(response => response.json())
       .then(data => {  
            console.log(data)
            displayVariantDetails(data)
       })
       .catch(error => console.error('Error fetch data:', error))
    }
}

function displayVariantDetails(variant) {

    // lấy modal
    const variantModal = document.getElementById('variantSidebar')

    // hiển thị tên của variant
    document.getElementById('variantNameSpan').innerHTML = variant.name

    let sumStock = 0

    // hiển thị hàng tồn theo lô
    const stockTable = document.getElementById('stockList')
    stockTable.innerHTML = '';

    variant.stocks.forEach(stock => {
        const row = document.createElement('tr');
        row.onclick = () => {
            navigateToBatchDetail(stock.batch.id, stock.batch.batch_number)
        }

        const status = stock.stock === 0 ? 1 :          // nếu lô hàng đã được bán hết, status = 1
                        new Date(stock.batch.expiry_date) < new Date() ? 2 :        // nếu lô hàng đã hết hạn, status = 2
                        Math.ceil((new Date(stock.batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) < 180 ? 3 : 4
                        // Tính số ngày hết hạn của một sản phẩm
                        // Nếu < 180 ngày ~ 6 tháng => lô hàng sắp hết hạn, status = 3

        row.innerHTML = `
            <td class="text-center">${stock.batch.id}</td>
            <td class="text-center">${stock.batch.batch_number}</td>
            <td class="text-center">${stock.batch.manufacturing_date}</td>
            <td class="text-center">${stock.batch.expiry_date}</td>
            <td class="text-center">${stock.stock}</td>
            <td class="text-center">
                <span class=" product-status ${status === 1 ? 'status-draft' : status === 2 ? 'status-outofstock' : status === 3 ? 'status-lowstock' : 'status-instock'}">
                    ${status === 1 ? 'Hết hàng' : status === 2 ? 'Đã hết hạn' : status === 3 ? 'Sắp hết hạn' : 'Còn hàng'}
                </span>
                
            </td>
        `;
        stockTable.appendChild(row);
        sumStock += parseInt(stock.stock) || 0
    })

    document.getElementById('variantStockSpan').innerHTML = sumStock

    let nowPrice = null
    document.getElementById('variantPriceSpan').innerHTML = 0
    // hiển thị giá bán
    const priceTable = document.getElementById('priceList')
    priceTable.innerHTML = ''

    if (variant.prices.length > 0) {
        variant.prices.forEach(price => {
            const row = document.createElement('tr');
    
            const formattedPrice = formatPrice(parseFloat(price.price))
    
            const startDateTime = formatISODate(price.start_date)
            const endDateTime = formatISODate(price.end_date)
    
            row.setAttribute('data-id', price.id)
    
            row.innerHTML = `
                <td class="text-center">${price.id}</td>
                <td class="text-center">${startDateTime}</td>
                <td class="text-center">${endDateTime}</td>
                <td class="text-center">${formattedPrice}</td>
                <td class="text-center">
                    <button onclick="editPrice(${price.id})" type="button" class="btn btn-edit" data-bs-toggle="tooltip" data-bs-placeme="bottom" data-bs-title="Chỉnh sửa">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                </td>
            `;
            priceTable.appendChild(row);
    
            if (nowPrice === null) {
                nowPrice = price
            }
    
            else {
                if (new Date(price.start_date) <= new Date() && (price.end_date === null || new Date(price.end_date) >= new Date())) {
                    nowPrice = price
                }
                else {
                    if (new Date(nowPrice.end_date) <= new Date(price.end_date)) {
                        nowPrice = price
                    }
                }
            }
        })
    
        document.getElementById('variantPriceSpan').innerHTML = formatPrice(nowPrice.price);
    }

    sessionStorage.setItem('variantID', variant.id)

    initTooltips()

    toggleVariantSidebar()
}



//----------------------------------------------------------------
// Thay đổi tên của variants
//----------------------------------------------------------------

document.getElementById('newVariantName').addEventListener('blur', () => {
    const variantNameInput = document.getElementById('newVariantName')

    if (!variantNameInput.value || variantNameInput.value.trim() === '') {
        if (variantNameInput.classList.contains('is-valid')) {
            variantNameInput.classList.remove('is-valid');
        }
        variantNameInput.classList.add('is-invalid');
    }
    else {
        if (variantNameInput.classList.contains('is-invalid')) {
            variantNameInput.classList.remove('is-invalid');
        }
        variantNameInput.classList.add('is-valid');
    }
})

async function editVariantName() {
    const variantID = sessionStorage.getItem('variantID')

    const access_token = await getValidAccessToken()

    fetch(`http://127.0.0.1:8000/api/products/variant_detail/${variantID}/`, {
        method: 'PUT',
        body: JSON.stringify({name: document.getElementById('newVariantName').value}),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        }
    })
    .then(response => response.json())
    .then(variant => {
        // if (variant && variant.name) { // Kiểm tra dữ liệu trả về có hợp lệ không
        document.getElementById('variantNameSpan').innerHTML = variant.name;
        document.getElementById('variantNameSpan').offsetHeight;
        // } else {
        //     console.error("Invalid API response:", variant);
        // }

        console.log("Variant:", document.getElementById('variantNameSpan').innerHTML )

        const newVariantNameModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('newVariantNameModal'))
        newVariantNameModal.hide()
    })
    .catch(error => console.error('Error:', error))
}

validateForm(document.getElementById('newVariantNameForm'), () => {}, editVariantName)

//----------------------------------------------------------------
// Validate price form
//----------------------------------------------------------------

function confirmSaving(input) {
    if (input.classList.contains('is-invalid')) {
        input.classList.remove('is-invalid');
    }

    input.classList.add('is-valid');
    document.getElementById('price-warning-message').innerHTML = ''

    hideWarningPriceModal()
}

function confirmEdtiting(input) {
    if (input.classList.contains('is-valid')) {
        input.classList.remove('is-valid');
    }
    input.classList.add('is-invalid');
    input.nextElementSibling.innerHTML = 'Vui lòng nhập lại giá trị mới'

    hideWarningPriceModal()
}

function showWarningPriceModal() {
    const warningModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('warningPriceModal'))

    $('#warningPriceModal').on('show.bs.modal', () => {
        document.getElementById('priceModal').style.filter = 'blur(3px)'
    })

    warningModal.show()
}

function hideWarningPriceModal() {
    const warningModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('warningPriceModal'))

    $('#warningPriceModal').on('hidden.bs.modal', () => {
        document.getElementById('priceModal').style.filter = 'none'
    })

    warningModal.hide()
}

document.getElementById('newPrice').addEventListener('blur', () => {
    const priceInput = document.getElementById('newPrice')

    const regex = /^\d+$/
    
    if(!priceInput.value || priceInput.value.trim() === '') {
        if (priceInput.classList.contains('is-valid')) {
            priceInput.classList.remove('is-valid');
        }
        priceInput.classList.add('is-invalid');
        priceInput.nextElementSibling.innerHTML = 'Vui lòng nhập giá bán'
    }

    else {
        if (!regex.test(priceInput.value)) {
            if (priceInput.classList.contains('is-valid')) {
                priceInput.classList.remove('is-valid');
            }
            priceInput.classList.add('is-invalid');
            priceInput.nextElementSibling.innerHTML = 'Giá bán phải là số'
        }
        else {
            if (parseFloat(priceInput.value) < 1000) {
                document.getElementById('price-warning-message').innerHTML = `Giá bán dưới 1.000 VND. Bạn có chắc chắn lưu với giá <strong>${formatPrice(parseFloat(priceInput.value))}</strong> không?`
                
                document.getElementById('confirmSavingBtn').onclick = () => {
                    confirmSaving(priceInput)
                }
                
                document.getElementById('confirmEditingBtn').onclick = () => {
                    confirmEdtiting(priceInput)
                }

                showWarningPriceModal()
            }
            else {
                if (priceInput.classList.contains('is-invalid')) {
                    priceInput.classList.remove('is-invalid');
                }
                priceInput.classList.add('is-valid');
                priceInput.nextElementSibling.innerHTML = ''
                document.getElementById('price-warning-message').innerHTML = ''      
            }
        }
    }
})

document.getElementById('startDateTime').addEventListener('change', async () => {
    const startDateTime = document.getElementById('startDateTime')
    sessionStorage.setItem('conflict_id', false)

    const response = await fetch('http://127.0.0.1:8000/api/products/check_date_time_price/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            start_date: new Date(startDateTime.value).toISOString(),
            variant: parseFloat(sessionStorage.getItem('variantID')),
        }),
    })

    const result = await response.json()

    console.log('conflicts: ', result)

    if (result.conflicts) {
        if (startDateTime.classList.contains('is-valid')) {
            startDateTime.classList.remove('is-valid');
        }
        startDateTime.classList.add('is-invalid');

        document.getElementById('price-warning-message').innerHTML = 
        `Hiện tại giá bán <strong>${formatPrice(result.price)}</strong> vẫn còn hiệu lực đến
        <strong>${formatISODate(result.end_date)}</strong>.
        Nếu bạn tiếp tục lưu, giá bán này sẽ được thay đổi thời gian để
         <strong class="text-danger">ngừng hiệu lực vào ${formatISODate(new Date(startDateTime.value))}</strong>.
        Bạn có chắc chắn giữ ngày bắt đầu hiệu lực này không?`;
        
        document.getElementById('confirmSavingBtn').onclick = () => {
            confirmSaving(startDateTime)
            sessionStorage.setItem('conflict_id', result.id)
        }
        
        document.getElementById('confirmEditingBtn').onclick = () => {
            confirmEdtiting(startDateTime)
        }

        showWarningPriceModal()
    }

    else {
        if (startDateTime.classList.contains('is-invalid')) {
            startDateTime.classList.remove('is-invalid');
        }
        startDateTime.classList.add('is-valid');
        document.getElementById('price-warning-message').innerHTML = ''
        document.getElementById('price-warning-message').classList.remove('warning-price')
    }

    if (startDateTime.classList.contains('is-valid')) {
        const endDateTime = document.getElementById('endDateTime')
        if (endDateTime.classList.contains('end-before-start')) {
            if (new Date(endDateTime.value) >= new Date(startDateTime.value)) {
                endDateTime.classList.remove('is-invalid', 'end-before-start');
            }
            endDateTime.classList.add('is-valid')
        }
    }
})

document.getElementById('endDateTime').addEventListener('change', () => {
    const endDateTime = document.getElementById('endDateTime')
    const startDateTime = document.getElementById('startDateTime')

    if (startDateTime.value === '' || startDateTime.classList.contains('is-invalid')) {
        if (endDateTime.classList.contains('is-valid')) {
            endDateTime.classList.remove('is-valid');
        }
        endDateTime.classList.add('is-invalid');
        endDateTime.nextElementSibling.innerHTML = 'Vui lòng chọn ngày giá bắt đầu có hiệu lực trước'
    }

    else {
        const start = new Date(startDateTime.value)
        const end = new Date(endDateTime.value)

        if (end < start) {
            if (endDateTime.classList.contains('is-valid')) {
                endDateTime.classList.remove('is-valid');
            }
            endDateTime.classList.add('is-invalid', 'end-before-start');
            endDateTime.nextElementSibling.innerHTML = 'Ngày giá kết thúc hiệu lực phải sau ngày bắt đầu'
        }

        else {
            if (endDateTime.classList.contains('is-invalid')) {
                endDateTime.classList.remove('is-invalid', 'end-before-start');
            }
            endDateTime.classList.add('is-valid');
            endDateTime.nextElementSibling.innerHTML = ''
        }
    }
})



//----------------------------------------------------------------
// Thao tác với price
//----------------------------------------------------------------

function submitPriceForm() {

    const action = document.getElementById('priceFormSubmitBtn').getAttribute('data-action')
    
    if(action === 'update') {
        updatePrice()
        console.log('update success');
    }

    else if (action === 'create') {
        createPrice()
        console.log('create success');
    }
};

validateForm(document.getElementById('priceForm'), () => {}, submitPriceForm)


//----------------------------------------------------------------
// Thêm giá bán mới

$('#priceModal').on('hidden.bs.modal', () => {
    document.getElementById('startDateTime').disabled = false
    document.getElementById('endDateTime').disabled = false
    document.getElementById('priceForm').reset()
    document.getElementById('priceForm').classList.remove('was-validated')
    document.querySelectorAll('#priceForm input').forEach(input => {
        input.classList.remove('is-valid', 'is-invalid')
    })
})

function showNewPriceModal() {

    document.getElementById('priceFormSubmitBtn').setAttribute('data-action', 'create')

    const priceModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('priceModal'))
    priceModal.show()
}

async function createPrice() {
    const price = parseFloat(document.getElementById('newPrice').value)
    const start_date = new Date(document.getElementById('startDateTime').value).toISOString()
    const end_date = new Date(document.getElementById('endDateTime').value).toISOString()
    const variantID = parseInt(sessionStorage.getItem('variantID'))

    const newPrice = {  
        price: price,
        start_date: start_date,
        end_date: end_date,
        variant: variantID
    }

    if (sessionStorage.getItem('conflict_id') !== false) {
        newPrice.conflict_id = parseInt(sessionStorage.getItem('conflict_id'))
    }

    const access_token = await getValidAccessToken()

    fetch('http://127.0.0.1:8000/api/products/prices/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(newPrice)
    })
    .then(response => response.json())
    .then(price => {
        alert("Lưu giá bán mới thành công.")
        console.log(price)
        document.getElementById('priceList').innerHTML += `
            <tr data-id='${price.id}'>
                <td class="text-center">${price.id}</td>
                <td class="text-center">${formatISODate(price.start_date)}</td>
                <td class="text-center">${formatISODate(price.end_date)}</td>
                <td class="text-center">${formatPrice(price.price)}</td>
                <td class="text-center">
                    <button onclick="editPrice(${price.id})" type="button" class="btn btn-edit" data-bs-toggle="tooltip" data-bs-placeme="bottom" data-bs-title="Chỉnh sửa">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                </td>
            </tr>
        `

        if (new Date(price.start_date) <= new Date()) {
            document.getElementById('variantPriceSpan').innerHTML = formatPrice(price.price);
        }
        
        // sessionStorage.removeItem('conflict_id')
        const priceModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('priceModal'))
        priceModal.hide()
    })
    .catch(error => console.error('Error:', error))
}

//----------------------------------------------------------------
// Chỉnh sửa giá bán
function editPrice(priceID) {
    fetch(`http://127.0.0.1:8000/api/products/prices/${priceID}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(price => {
        sessionStorage.setItem('priceID', price.id)

        document.getElementById('priceModalLabel').innerHTML = 'Chỉnh sửa giá bán'


        document.getElementById('startDateTime').value = parseDateTimeLocal(price.start_date)
        document.getElementById('endDateTime').value = parseDateTimeLocal(price.end_date)

        // Tạm thời vô hiệu hóa
        document.getElementById('startDateTime').disabled = true
        document.getElementById('endDateTime').disabled = true

        document.getElementById('newPrice').value = parseFloat(price.price)
        document.getElementById('priceFormSubmitBtn').setAttribute('data-action', 'update')
        sessionStorage.setItem('conflict_id', false)

        const priceModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('priceModal'))
        priceModal.show()
    })
}

function updatePrice() {
    const new_price = parseFloat(document.getElementById('newPrice').value)

    // Tạm thời chưa hoàn thiện để thay đổi ngày
    // const new_start_date = new Date(document.getElementById('startDateTime').value).toISOString()
    // const new_end_date = new Date(document.getElementById('endDateTime').value).toISOString()

    const newPrice = {  
        price: new_price,
        // start_date: new_start_date,
        // end_date: new_end_date,
    }

    // if (sessionStorage.getItem('conflict_id') !== false) {
    //     newPrice.conflict_id = parseInt(sessionStorage.getItem('conflict_id'))
    // }

    fetch(`http://127.0.0.1:8000/api/products/prices/${sessionStorage.getItem('priceID')}/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPrice)
    })
    .then(response => response.json())
    .then(price => {
        const row = document.querySelector('#priceList [data-id="' + price.id + '"]');

        // Tạm thời chưa hoàn thiện để cập nhật ngày
        // row.children[1].innerHTML = formatISODate(price.start_date)
        // row.children[2].innerHTML = formatISODate(price.end_date)

        row.children[3].innerHTML = formatPrice(price.price)

        // document.querySelectorAll('#priceForm input').forEach(input => {
        //     input.value = ''
        //     input.classList.remove('is-valid', 'is-invalid')
        // })

        const priceModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('priceModal'))
        priceModal.hide()
    })
}


// ----------------------------------------------------
// Ảnh
// ----------------------------------------------------


document.getElementById('productImages').addEventListener('change', (event) => {

    if(sessionStorage.getItem('productImages')) {
        sessionStorage.removeItem('productImages')
    }
 
    const imageFiles = Array.from(event.target.files)
    if(imageFiles.length === 0)
        return

    showImageInSlider(imageFiles)
})