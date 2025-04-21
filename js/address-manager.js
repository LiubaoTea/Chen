// 导入省市区数据
import regionData from '../src/utils/data.json';

// 加载省市区数据
export async function loadRegionData(selectedProvince = '', selectedCity = '', selectedDistrict = '') {
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');

    // 加载省份数据
    provinceSelect.innerHTML = '<option value="">请选择省份</option>';
    Object.entries(regionData['86']).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        if (name === selectedProvince) option.selected = true;
        provinceSelect.appendChild(option);
    });

    // 如果有选中的省份，加载对应的城市
    if (selectedProvince) {
        await loadCities(selectedProvince, selectedCity);
        if (selectedCity) {
            await loadDistricts(selectedProvince, selectedCity, selectedDistrict);
        }
    }
}

// 加载城市数据
export async function loadCities(provinceName, selectedCity = '') {
    const citySelect = document.getElementById('city');
    citySelect.innerHTML = '<option value="">请选择城市</option>';

    // 根据省份名称找到对应的省份代码
    const provinceCode = Object.entries(regionData['86']).find(([_, name]) => name === provinceName)?.[0];
    if (!provinceCode) return;

    // 加载城市数据
    Object.entries(regionData[provinceCode]).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        if (name === selectedCity) option.selected = true;
        citySelect.appendChild(option);
    });
}

// 加载区县数据
export async function loadDistricts(provinceName, cityName, selectedDistrict = '') {
    const districtSelect = document.getElementById('district');
    districtSelect.innerHTML = '<option value="">请选择区/县</option>';

    // 找到省份代码
    const provinceCode = Object.entries(regionData['86']).find(([_, name]) => name === provinceName)?.[0];
    if (!provinceCode) return;

    // 找到城市代码
    const cityCode = Object.entries(regionData[provinceCode]).find(([_, name]) => name === cityName)?.[0];
    if (!cityCode) return;

    // 加载区县数据
    Object.entries(regionData[cityCode]).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        if (name === selectedDistrict) option.selected = true;
        districtSelect.appendChild(option);
    });
}