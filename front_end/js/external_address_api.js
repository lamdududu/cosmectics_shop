function initAddressSelector(provinceSelector, districtSelector, wardSelector, 
                            provinceSelectElement, districtSelectElement, wardSelectElement,
                            dropdownParent) {

    console.log(dropdownParent)

    provinceSelector.select2({
        placeholder: 'Chọn tỉnh/thành phố trực thuộc TW',
        // allowClear: true,
        width: '100%',
        dropdownParent: dropdownParent,
    })

    districtSelector.select2({
        placeholder: 'Chọn quận/huyện/thành phố',
        // allowClear: true,
        width: '100%',
        dropdownParent: dropdownParent
    })

    wardSelector.select2({
        placeholder: 'Chọn xã/phường/thị trấn',
        // allowClear: true,
        width: '100%',
        dropdownParent: dropdownParent
    })

    getAddressApi(provinceSelectElement, null, null)

    provinceSelector.on('change', function() {
        checkSelector(provinceSelector)
        console.log("Tỉnh:", $(this).val());
        districtSelectElement.innerHTML = '<option value="-99999" selected disabled>Chọn huyện/quận/thành</option>'
        wardSelectElement.innerHTML = '<option value="-99999" selected disabled>Chọn xã/phường/thị trấn</option>'
        
        getAddressApi(districtSelectElement, $(this).val(), null)
    })

    districtSelector.on('change', () => {
        checkSelector(districtSelector)
        console.log("Tỉnh, huyện:", provinceSelector.val(), ",", districtSelector.val());
        wardSelectElement.innerHTML = '<option value="-99999" selected disabled>Chọn xã/phường/thị trấn</option>'
        getAddressApi(wardSelectElement, provinceSelector.val(), districtSelector.val())
    })
    wardSelector.on('change', () => {
        checkSelector(wardSelector)
        console.log("Tỉnh, huyện, xã/phư��ng:", provinceSelector.val(), ",", districtSelector.val(), ",", wardSelector.val());
    })
}

function checkSelector(selector) {

    if(selector.val() === null) {
        console.log("Selector:" + selector.val())
        if(selector.hasClass('is-valid')) {
            selector.removeClass('is-valid')
        }
        selector.addClass('is-invalid')
    }

    else {
        console.log("Selector:" + selector.val())
        if(selector.hasClass('is-invalid')) {
            selector.removeClass('is-invalid')
        }
        selector.addClass('is-valid')
    }
}


function getAddressApi(selector=null, province_code=null, district_code=null) {
    
    if(selector) {

        fetch('http://provinces.open-api.vn/api/?depth=3', {
            method: 'GET',
        })
       .then(response => response.json())
       .then(data => {
            
            if(province_code) {
                if(district_code) {
                    data.forEach(element => {
                        if(element.code == province_code) {

                            const districts = element.districts

                            districts.forEach(district => {

                                if(district.code == district_code) {
                                    const wards = district.wards
                                    
                                    wards.forEach(ward => {                                   
                                        const option = document.createElement('option');                                                       
                                        option.value = ward.code;
                                        option.innerHTML = `${ward.name}`;
                                        selector.appendChild(option);                         
                                    })
                                }
                            });
                        }
                    })
                }
                else {
                    data.forEach(element => {
                        if(element.code == province_code) {
                            const districts = element.districts

                            districts.forEach(district => {
                                const option = document.createElement('option');
                                option.value = district.code;
                                option.innerHTML = `${district.name}`;
                                selector.appendChild(option);
                            })
                        }
                   });  
                }
            }

            else {
                data.forEach(element => {
                    const option = document.createElement('option');
                    option.value = element.code;
                    option.innerHTML = `${element.name}`;
                    selector.appendChild(option);   
                });
            }
     
       })
       .catch(error => console.error('Error fetch data:', error))
    }
}