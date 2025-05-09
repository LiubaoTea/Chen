// 获取地址数据
async function getAddressData() {
    try {
        const response = await fetch('../src/utils/data.json');
        if (!response.ok) {
            throw new Error('加载地址数据失败');
        }
        return await response.json();
    } catch (error) {
        console.error('获取地址数据失败:', error);
        return {};
    }
}

let addressData = {};

// 初始化地址选择器
export async function initAddressSelector() {
    // 获取地址数据
    addressData = await getAddressData();
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');

    // 加载省份数据
    const provinces = addressData['86'];
    for (const code in provinces) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = provinces[code];
        provinceSelect.appendChild(option);
    }

    // 省份选择事件
    provinceSelect.addEventListener('change', () => {
        const selectedProvince = provinceSelect.value;
        updateCitySelect(selectedProvince);
        // 重置区县选择
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
    });

    // 城市选择事件
    citySelect.addEventListener('change', () => {
        const selectedCity = citySelect.value;
        updateDistrictSelect(selectedCity);
    });
}

// 更新城市选择器
function updateCitySelect(provinceCode) {
    const citySelect = document.getElementById('city');
    citySelect.innerHTML = '<option value="">请选择城市</option>';

    if (provinceCode && addressData[provinceCode]) {
        const cities = addressData[provinceCode];
        for (const code in cities) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = cities[code];
            citySelect.appendChild(option);
        }
    }
}

// 更新区县选择器
function updateDistrictSelect(cityCode) {
    const districtSelect = document.getElementById('district');
    districtSelect.innerHTML = '<option value="">请选择区县</option>';

    if (cityCode && addressData[cityCode]) {
        const districts = addressData[cityCode];
        for (const code in districts) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = districts[code];
            districtSelect.appendChild(option);
        }
    }
}