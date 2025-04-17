
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("batchFormSubmitBtn")

    if (sessionStorage.getItem("batch_id") !== 'new_batch') {
        btn.setAttribute('data-action', 'updateBatch')
        btn.innerHTML = '<i class="bi bi-floppy"></i><span>Lưu chỉnh sửa</span>'
    }

    else {
        btn.setAttribute('data-action', 'createBatch')
        btn.innerHTML = '<i class="bi bi-plus"></i><span>Lưu lô hàng</span>'
        createVariantOfNewProduct()
    }
})

const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                    <li class="breadcrumb-item"><a href="./batch_list.html">Lô hàng</a></li>
                    <li class="breadcrumb-item active" aria-current="page">Chi tiết lô hàng</li>
                `
            }
        })
    })
})

observer_navbar.observe(document.body, { childList: true, subtree: true })

// Xóa khi rời khỏi trang
// window.addEventListener('beforeunload', () => {
//     sessionStorage.removeItem('batch_id')
// })

//----------------------------------------------------------------
// Lấy và hiển thị dữ liệu cho các selector
//----------------------------------------------------------------


getOptionForSelector('productSelector', 'http://127.0.0.1:8000/api/products/products/?no_pagination=true')


$(document).ready( () => {
    $('#productSelector').select2({
        placeholder: 'Chọn sản phẩm',
        allowClear: true,
    });

    $('#productSelector').on('select2:select', function (event) {

        const data = event.params.data
        
        if(event.params && data) {     
            // if(data.isEditing == true)
            //     $('#productSelector option:selected').text(data.text)
            // else 
            if($('#productSelector option[value="' + data.id + '"]').length === 0)
                $('#productSelector').append(new Option(data.text, data.id, true, true))
        }
        
        const productID = data ? data.id : $(this).val()

        fetch(`http://127.0.0.1:8000/api/products/variants/?product=${productID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(variantData => {
            // if(event.params.data.stocks)
            //     createVariantInput(variantData, event.params.data.stocks)
            // else createVariantInput(variantData)
            createVariantInput(variantData, event.params.data.stocks)
        })
        .catch(error => console.error('Error fetch data:', error))
    })
})


//----------------------------------------------------------------
// Lấy dữ liệu cho variants
//----------------------------------------------------------------


function createVariantInput(variantData, stocks) {
    const variantList = document.getElementById('variantList')
    
    if(Array.isArray(variantData)) {
        variantList.innerHTML = ''
    }

    const variants = Array.isArray(variantData) ? variantData : [variantData]

    variants.forEach(variant => {
        const variantGroup = document.createElement('div')
        variantGroup.classList.add('input-group')

        const variantLabel = document.createElement('label')
        variantLabel.for = 'variantItemQuantity'
        variantLabel.classList.add('input-group-text')
        variantLabel.textContent = variant.name

        const variantInput = document.createElement('input')
        variantInput.type = 'text'
        variantInput.name = 'variantItemQuantity'
        variantInput.setAttribute('data-id', variant.id)
        variantInput.placeholder = "Nhập số lượng..."
        variantInput.classList.add('form-control')

        const invalidVariant = document.createElement('div')
        invalidVariant.classList.add('invalid-feedback')
        invalidVariant.innerHTML = 'Số lượng phải là số nguyên dương'

        variantList.appendChild(variantGroup)
        variantGroup.appendChild(variantLabel)
        variantGroup.appendChild(variantInput)
        variantGroup.appendChild(invalidVariant)
    })

    if(stocks) {
        showStock(stocks)
    }
}


function showStock(stocks) {
    // console.log('stocks:', stocks)
    document.querySelectorAll('#variantList input').forEach(variant => {
        stocks.forEach(stock => {
            if(stock.variant == variant.getAttribute('data-id')) {
                variant.value = stock.stock
            }
        })
    })
}

//----------------------------------------------------------------
// Kiểm tra dữ liệu input
//----------------------------------------------------------------
// console.log(sessionStorage.getItem('batchNumber'))

validateForm(document.getElementById('batchForm'), validateItemQuantity, submitEvent)

function submitEvent() {

    const action = document.getElementById('batchFormSubmitBtn').getAttribute('data-action')
    
    if(action === 'updateBatch') {
        updateBatch()
        console.log('update success');
    }

    else if (action === 'createBatch') {
        createBatch()
        console.log('create success');
    }
};

document.getElementById('batchNumber').addEventListener('blur', async () => {
    const batchNumber = document.getElementById('batchNumber')

    if(!batchNumber.value || batchNumber.value.trim() == '') {
        if(batchNumber.classList.contains('is-valid')) {
            batchNumber.classList.remove('is-valid')
        }
        batchNumber.classList.add('is-invalid')
        batchNumber.nextElementSibling.innerHTML = "Vui lòng nhập số lô"
    }
    else {
        if(await checkBatchNumber(batchNumber.value) && batchNumber.value.toLowerCase() !== sessionStorage.getItem('batchNumber').toLowerCase()) {
            if(batchNumber.classList.contains('is-valid')) {
                batchNumber.classList.remove('is-valid')
            }
            batchNumber.classList.add('is-invalid')
            batchNumber.nextElementSibling.innerHTML = "Số lô đã tồn tại"
        }
        else {
            if(batchNumber.classList.contains('is-invalid')) {
                batchNumber.classList.remove('is-invalid')
            }
            batchNumber.classList.add('is-valid')
        }
    }
})

async function checkBatchNumber(batchNumber) {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/products/check-batch-number/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                batch_number: batchNumber,
            })
        })

        const data = await response.json()
        return data.exists
    }

    catch(error) {
        console.error('Error check batch number:', error)
    }
}

document.getElementById('origin').addEventListener('blur', () => {
    const origin = document.getElementById('origin')

    if (!origin.value || origin.value.trim() == '') {
        if (origin.classList.contains('is-valid')) {
            origin.classList.remove('is-valid')
        }
        origin.classList.add('is-invalid')
        origin.nextElementSibling.innerHTML = "Vui lòng nhập xuất xứ của lô hàng"
    }

    else {
        if (origin.classList.contains('is-invalid')) {
            origin.classList.remove('is-invalid')
        }
        origin.classList.add('is-valid')
    }
})

document.getElementById('manufacturingDate').addEventListener('change', () => {
    const manufacturingDate = document.getElementById('manufacturingDate')
    const today = new Date()

    if (!manufacturingDate.value) {
        if (manufacturingDate.classList.contains('is-valid')) {
            manufacturingDate.classList.remove('is-valid')
        }
        manufacturingDate.classList.add('is-invalid')
        manufacturingDate.nextElementSibling.innerHTML = "Vui lòng nhập ngày sản xuất"
    }

    else {
        if (manufacturingDate.valueAsDate.getTime() >= today.getTime()) {
            if (manufacturingDate.classList.contains('is-valid')) {
                manufacturingDate.classList.remove('is-valid')
            }
            manufacturingDate.classList.add('is-invalid')
            manufacturingDate.nextElementSibling.innerHTML = "Ngày sản xuất phải nhỏ hơn ngày hiện tại"
        }

        else {
            if (manufacturingDate.classList.contains('is-invalid')) {
                manufacturingDate.classList.remove('is-invalid')
            }
            manufacturingDate.classList.add('is-valid')
        }
    }
})


document.getElementById('expiryDate').addEventListener('change', () => {
    const expiryDate = document.getElementById('expiryDate')
    const today = new Date()

    if (!expiryDate.value) {
        if (expiryDate.classList.contains('is-valid')) {
            expiryDate.classList.remove('is-valid')
        }
        expiryDate.classList.add('is-invalid')
        expiryDate.nextElementSibling.innerHTML = "Vui lòng nhập hạn sử dụng"
    }

    else {
        if (expiryDate.valueAsDate.getTime() <= today.getTime()) {
            if (expiryDate.classList.contains('is-valid')) {
                expiryDate.classList.remove('is-valid')
            }
            expiryDate.classList.add('is-invalid')
            expiryDate.nextElementSibling.innerHTML = "Ngày hết hạn phải lớn hơn ngày hiện tại"
        }

        else {
            if (expiryDate.classList.contains('is-invalid')) {
                expiryDate.classList.remove('is-invalid')
            }
            expiryDate.classList.add('is-valid')
        }
    }
})


document.getElementById('itemQuantity').addEventListener('blur', () => {
    const itemQuantity = document.getElementById('itemQuantity')
    const regex = /^\d+$/

    if(!itemQuantity.value) {
        if(itemQuantity.classList.contains('is-valid')) {
            itemQuantity.classList.remove('is-valid')
        }
        itemQuantity.classList.add('is-invalid')
        itemQuantity.nextElementSibling.innerHTML = "Vui lòng nhập số lượng hàng hóa"
    }
    
    else {
        if (!regex.test(itemQuantity.value) || itemQuantity.value < 1) {
            if (itemQuantity.classList.contains('is-valid')) {
                itemQuantity.classList.remove('is-valid')
            }
            itemQuantity.classList.add('is-invalid')
            itemQuantity.nextElementSibling.innerHTML = "Số lượng phải là số nguyên và lớn hơn 0"
        }

        else {
            if (itemQuantity.classList.contains('is-invalid')) {
                itemQuantity.classList.remove('is-invalid')
            }
            itemQuantity.classList.add('is-valid')
        }
    }
})

document.getElementById('variantList').addEventListener('blur', (event) => {
    
    if (event.target.matches('input[name="variantItemQuantity"]')) {
        const regex = /^\d+$/

        if(regex.test(event.target.value) || event.target.value == '') {
            if (event.target.classList.contains('is-invalid')) {
                event.target.classList.remove('is-invalid')
            }
        }
        else {
            if (event.target.classList.contains('is-valid')) {
                event.target.classList.remove('is-valid')
            }
            event.target.classList.add('is-invalid')
            // event.target.classList.nextElementSibling.innerHTML = "Số lượng phải là số nguyên"
        }
        console.log("Input variant")
    }
}, true)

function validateItemQuantity() {
    const itemQuantity = document.getElementById('itemQuantity').value
    
    let sumItem = 0
    let flag = false
    
    Array.from(document.querySelectorAll('#variantList input')).forEach(item => {
        sumItem += parseInt(item.value) || 0

        if(parseInt(item.value)) {
            flag = true
        }
    })


    const invalidVariant = document.getElementById('invalidVariant')
    if (sumItem > parseInt(itemQuantity)) {
        if (invalidVariant.classList.contains('is-valid')) {
            invalidVariant.classList.remove('is-valid', 'invalid-variant')
        }

        invalidVariant.classList.add('is-invalid', 'invalid-variant')
        invalidVariant.setCustomValidity('error');
        invalidVariant.nextElementSibling.innerHTML = "Tổng số lượng hàng trong các phân loại không thể lớn hơn số lượng nhập trong lô"
    }
    else {
        if (sumItem != parseInt(itemQuantity) && sessionStorage.getItem('batch_id') === 'new_batch') {
            if (invalidVariant.classList.contains('is-valid')) {
                invalidVariant.classList.remove('is-valid', 'invalid-variant')
            }

            invalidVariant.classList.add('is-invalid', 'invalid-variant')
            invalidVariant.setCustomValidity('error');
            invalidVariant.nextElementSibling.innerHTML = "Tổng số lượng hàng trong các phân loại phải bằng số lượng nhập trong lô"
        }    
        else {
            if (flag == false) {
                if (invalidVariant.classList.contains('is-valid')) {
                    invalidVariant.classList.remove('is-valid', 'invalid-variant')
                }
    
                invalidVariant.classList.add('is-invalid', 'invalid-variant')
                invalidVariant.setCustomValidity('error');
                invalidVariant.nextElementSibling.innerHTML = "Nếu không còn hàng tồn trong phân loại, nhập 0"
            }

            else {
                if(invalidVariant.classList.contains('is-invalid')) {
                    invalidVariant.classList.remove('is-invalid', 'invalid-variant')
                }

                invalidVariant.classList.add('is-valid', 'invalid-variant')
                invalidVariant.setCustomValidity('');
            }
        }
    }
    console.log("Checked")
}




// //----------------------------------------------------------------
// // Lấy thông tin chi tiết của một product (chưa bao gồm thông tin của variant)
// //----------------------------------------------------------------

function getBatch(id) {

    const batch_id = id ? id : sessionStorage.getItem('batch_id');
    
    // if(!batch_id) {
    //     alert('Không tìm thấy lô hàng. Điều này có thể xảy ra khi bạn cố tải lại trang.')
    //     window.location.href = './admin-batch-list.html'
    // }

    if (batch_id !== 'new_batch') {
        if (batch_id) {
            fetch(`http://127.0.0.1:8000/api/products/batch_detail/${batch_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(batchData => {
                // console.log(batchData)
                displayBatch(batchData)
                
                document.getElementById('productSelector').disabled = true
            })
            .catch(error => console.error('Error fetch data:', error))
        }
    }
}

function displayBatch(batchData) {
    
    document.getElementById('batchNumber').value = batchData.batch.batch_number
        
    document.getElementById('itemQuantity').value = batchData.batch.item_quantity

    document.getElementById('origin').value = batchData.batch.origin

    document.getElementById('manufacturingDate').value = batchData.batch.manufacturing_date

    document.getElementById('expiryDate').value = batchData.batch.expiry_date

    // console.log('batch id:', batchData.stock)

    $('#productSelector').val(batchData.product.id).trigger({
        type: 'select2:select',
        params: {
            data: { 
                id: batchData.product.id, 
                text: batchData.product.name, 
                stocks: sessionStorage.getItem('batch_id') ? batchData.stock : null,
            }
        }
    })

    console.log(batchData)
}

getBatch()



// // ----------------------------------------------------------------
// // Thao tác trên batch
// // ----------------------------------------------------------------


// // Lấy thông tin sản phẩm
function getDataFromBatchForm() {

    const data = {
        batch: {
            id: parseInt(sessionStorage.getItem('batch_id')),
            batch_number: document.getElementById('batchNumber').value,
            item_quantity: parseInt(document.getElementById('itemQuantity').value),
            origin: document.getElementById('origin').value,
            manufacturing_date: document.getElementById('manufacturingDate').value,
            expiry_date: document.getElementById('expiryDate').value,
        },
        stocks: getStock(),
    }

    console.log('Dữ liệu form:', data)

    return data
}

// Lấy số lượng tồn của mỗi phân loại
function getStock() {
    const variants = document.querySelectorAll('#variantList input')

    if(variants) {
        console.log('Variants:', variants.length)
    }

    return Array.from(variants).map(variant => {
        if(isNaN(parseInt(variant.value))) {
            return
        }

        console.log('Stock data:', variant.value)

        return {
            variant: parseInt(variant.getAttribute('data-id')),
            batch_id: parseInt(sessionStorage.getItem('batch_id')),
            stock: parseInt(variant.value),
        }
    }).filter(variant => variant !== undefined)
}


// Tạo sản phẩm mới
async function createBatch() {
    
    const data = getDataFromBatchForm()

    console.log('Dữ liệu form:', data)

    sessionStorage.setItem('batch_id', null)

    const access_token = await getValidAccessToken()

    fetch('http://127.0.0.1:8000/api/products/batch_detail/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(data)
    })
   .then(response => {
        if (response.ok) {
            return response.json()
        } else {
            throw new Error('HTTP error! status: ', response.status)
        }
   })
   .then (batchData => {
        alert('Lô hàng  mới đã tạo thành công!')
        window.location.href = `./batch_detail.html?id=${batchData.batch_number}`
        sessionStorage.setItem('batch_id', batchData.id)
        sessionStorage.setItem('batchNumber', batchData.batch_number)
    })
    .catch(error => console.error('Error:', error))
}


// Cập nhật sản phẩm
async function updateBatch() {
    const data = getDataFromBatchForm()

    console.log('Data:', data)

    const batch_id = sessionStorage.getItem('batch_id')

    if(!batch_id) {
        console.error('Batch ID does not exist')
        return
    }

    const access_token = await getValidAccessToken()

    fetch(`http://127.0.0.1:8000/api/products/batch_detail/${batch_id}/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            return response.json()
        } else {
            console.error('API response failed: ', error)
        }
    })
    .then(data => {
        alert('Lô hàng đã cập nhật thành công!')
        window.location.href = `./batch_detail.html?id=${data.batch_number}`
        sessionStorage.setItem('batch_id', data.id)
        sessionStorage.setItem('batch_number', data.batch_number)
    })
    .catch(error => console.error('Error:', error))
}

