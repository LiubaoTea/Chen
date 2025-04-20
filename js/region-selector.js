// 省市区数据
const regionData = {
    provinces: [
        { code: '110000', name: '北京市' },
        { code: '120000', name: '天津市' },
        { code: '130000', name: '河北省' },
        { code: '140000', name: '山西省' },
        { code: '150000', name: '内蒙古自治区' },
        { code: '210000', name: '辽宁省' },
        { code: '220000', name: '吉林省' },
        { code: '230000', name: '黑龙江省' },
        { code: '310000', name: '上海市' },
        { code: '320000', name: '江苏省' },
        { code: '330000', name: '浙江省' },
        { code: '340000', name: '安徽省' },
        { code: '350000', name: '福建省' },
        { code: '360000', name: '江西省' },
        { code: '370000', name: '山东省' },
        { code: '410000', name: '河南省' },
        { code: '420000', name: '湖北省' },
        { code: '430000', name: '湖南省' },
        { code: '440000', name: '广东省' },
        { code: '450000', name: '广西壮族自治区' },
        { code: '460000', name: '海南省' },
        { code: '500000', name: '重庆市' },
        { code: '510000', name: '四川省' },
        { code: '520000', name: '贵州省' },
        { code: '530000', name: '云南省' },
        { code: '540000', name: '西藏自治区' },
        { code: '610000', name: '陕西省' },
        { code: '620000', name: '甘肃省' },
        { code: '630000', name: '青海省' },
        { code: '640000', name: '宁夏回族自治区' },
        { code: '650000', name: '新疆维吾尔自治区' },
        { code: '710000', name: '台湾省' },
        { code: '810000', name: '香港特别行政区' },
        { code: '820000', name: '澳门特别行政区' }
    ],
    cities: {
        '110000': [{ code: '110100', name: '北京市' }],
        '120000': [{ code: '120100', name: '天津市' }],
        '130000': [
            { code: '130100', name: '石家庄市' },
            { code: '130200', name: '唐山市' },
            { code: '130300', name: '秦皇岛市' },
            { code: '130400', name: '邯郸市' },
            { code: '130500', name: '邢台市' },
            { code: '130600', name: '保定市' },
            { code: '130700', name: '张家口市' },
            { code: '130800', name: '承德市' },
            { code: '130900', name: '沧州市' },
            { code: '131000', name: '廊坊市' },
            { code: '131100', name: '衡水市' }
        ]
        // 其他省份的城市数据...
    },
    districts: {
        '110100': [{ code: '110101', name: '东城区' }, { code: '110102', name: '西城区' }],
        '120100': [{ code: '120101', name: '和平区' }, { code: '120102', name: '河东区' }],
        '130100': [
            { code: '130102', name: '长安区' },
            { code: '130104', name: '桥西区' },
            { code: '130105', name: '新华区' },
            { code: '130107', name: '井陉矿区' },
            { code: '130108', name: '裕华区' }
        ]
        // 其他城市的区县数据...
    }
};

// 初始化地区选择器
function initRegionSelector(container) {
    // 创建选择器HTML结构
    const html = `
        <div class="region-selector">
            <select id="province" class="region-select">
                <option value="">请选择省份</option>
                ${regionData.provinces.map(p => `<option value="${p.code}">${p.name}</option>`).join('')}
            </select>
            <select id="city" class="region-select" disabled>
                <option value="">请选择城市</option>
            </select>
            <select id="district" class="region-select" disabled>
                <option value="">请选择区县</option>
            </select>
        </div>
    `;
    container.innerHTML = html;

    // 获取选择器元素
    const provinceSelect = container.querySelector('#province');
    const citySelect = container.querySelector('#city');
    const districtSelect = container.querySelector('#district');

    // 省份选择事件
    provinceSelect.addEventListener('change', () => {
        const provinceCode = provinceSelect.value;
        updateCityOptions(provinceCode);
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        districtSelect.disabled = true;
    });

    // 城市选择事件
    citySelect.addEventListener('change', () => {
        const cityCode = citySelect.value;
        updateDistrictOptions(cityCode);
    });

    // 更新城市选项
    function updateCityOptions(provinceCode) {
        const cities = regionData.cities[provinceCode] || [];
        citySelect.innerHTML = `
            <option value="">请选择城市</option>
            ${cities.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
        `;
        citySelect.disabled = cities.length === 0;
    }

    // 更新区县选项
    function updateDistrictOptions(cityCode) {
        const districts = regionData.districts[cityCode] || [];
        districtSelect.innerHTML = `
            <option value="">请选择区县</option>
            ${districts.map(d => `<option value="${d.code}">${d.name}</option>`).join('')}
        `;
        districtSelect.disabled = districts.length === 0;
    }

    return {
        getSelectedRegion() {
            return {
                province: provinceSelect.options[provinceSelect.selectedIndex].text,
                city: citySelect.options[citySelect.selectedIndex].text,
                district: districtSelect.options[districtSelect.selectedIndex].text
            };
        }
    };
}

export { initRegionSelector };