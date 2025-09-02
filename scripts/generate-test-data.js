#!/usr/bin/env node

/**
 * Test Data Generator for Political Productivity Hub
 * Generates CSV and JSON files with realistic Korean contact data
 */

const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

// Configuration
const DEFAULT_CONTACTS_COUNT = 10000;
const OUTPUT_DIR = path.join(__dirname, '..', 'test-data');

// Korean data sets
const koreanNames = {
    lastNames: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍', '류', '고', '문', '양', '손', '배', '백', '허', '남', '심'],
    firstNames: {
        male: ['민수', '철수', '현우', '준호', '성호', '동현', '경수', '태우', '상훈', '우진', '지훈', '종민', '정우', '영수', '승민', '기태', '성진', '호준', '재민', '도현'],
        female: ['영희', '수연', '지은', '미영', '은정', '소영', '혜진', '나영', '예지', '다은', '서연', '하은', '지우', '수빈', '예은', '채원', '소현', '유진', '민정', '가은']
    }
};

const phoneAreaCodes = ['010-1234', '010-2345', '010-3456', '010-4567', '010-5678', '010-6789', '010-7890', '010-8901', '010-9012'];
const emailDomains = ['@gmail.com', '@naver.com', '@daum.net', '@hanmail.net', '@nate.com', '@korea.kr', '@seoul.go.kr'];

const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

const occupations = ['공무원', '교사', '의사', '간호사', '변호사', '회계사', '엔지니어', '디자이너', '기자', '경찰관', '소방관', '군인', '사업가', '자영업', '학생', '주부', '은퇴자', '농업', '서비스업', '제조업'];

const interests = ['교육', '의료', '환경', '경제', '복지', '교통', '문화', '스포츠', '기술', '농업', '안전', '주택', '일자리', '노인', '청년', '여성', '육아', '부동산', '세금', '국방'];

const tags = ['VIP', '후원자', '당원', '자원봉사자', '언론인', '공무원', '기업인', '청년', '시니어', '여성', '장애인', '농어민', '상인', '교육관계자', '의료진', 'IT종사자', '문화예술인', '종교인', '노조', '시민단체'];

// Utility functions
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function generateKoreanName() {
    const lastName = getRandomElement(koreanNames.lastNames);
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = getRandomElement(koreanNames.firstNames[gender]);
    return { name: lastName + firstName, gender };
}

function generatePhoneNumber() {
    const prefix = getRandomElement(phoneAreaCodes);
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${suffix}`;
}

function generateEmail(name) {
    const romanizedName = name.toLowerCase()
        .replace(/김/g, 'kim').replace(/이/g, 'lee').replace(/박/g, 'park')
        .replace(/최/g, 'choi').replace(/정/g, 'jung').replace(/강/g, 'kang')
        .replace(/조/g, 'cho').replace(/윤/g, 'yoon').replace(/장/g, 'jang')
        .replace(/임/g, 'lim').replace(/한/g, 'han').replace(/오/g, 'oh')
        .replace(/서/g, 'seo').replace(/신/g, 'shin').replace(/권/g, 'kwon')
        .replace(/황/g, 'hwang').replace(/안/g, 'ahn').replace(/송/g, 'song')
        .replace(/전/g, 'jeon').replace(/홍/g, 'hong');
    
    const domain = getRandomElement(emailDomains);
    const number = Math.floor(Math.random() * 999) + 1;
    return `${romanizedName}${number}${domain}`;
}

function generateKakaoId(name) {
    if (Math.random() > 0.7) return null; // 30% don't have KakaoTalk
    
    const romanizedName = name.toLowerCase()
        .replace(/김/g, 'kim').replace(/이/g, 'lee').replace(/박/g, 'park')
        .replace(/최/g, 'choi').replace(/정/g, 'jung').replace(/강/g, 'kang');
    
    const number = Math.floor(Math.random() * 9999) + 1;
    return `kakao_${romanizedName}${number}`;
}

function generateAddress() {
    const region = getRandomElement(regions);
    const district = ['중구', '서구', '동구', '남구', '북구', '수성구', '달서구'][Math.floor(Math.random() * 7)];
    const street = `${Math.floor(Math.random() * 999) + 1}번지`;
    return `${region} ${district} ${street}`;
}

function generateAge() {
    // Weighted distribution favoring voting age
    const weights = [
        { min: 20, max: 29, weight: 15 },
        { min: 30, max: 39, weight: 25 },
        { min: 40, max: 49, weight: 25 },
        { min: 50, max: 59, weight: 20 },
        { min: 60, max: 69, weight: 10 },
        { min: 70, max: 79, weight: 5 }
    ];
    
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const range of weights) {
        random -= range.weight;
        if (random <= 0) {
            return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        }
    }
    return 30; // fallback
}

function generateContact(index) {
    const nameData = generateKoreanName();
    const name = nameData.name;
    const phone = generatePhoneNumber();
    const email = generateEmail(name);
    const kakaoId = generateKakaoId(name);
    const age = generateAge();
    const region = getRandomElement(regions);
    const occupation = getRandomElement(occupations);
    const selectedInterests = getRandomElements(interests, Math.floor(Math.random() * 3) + 1);
    const selectedTags = getRandomElements(tags, Math.floor(Math.random() * 4) + 1);
    const notes = Math.random() > 0.6 ? `${occupation} 종사, ${selectedInterests.join(', ')} 관심` : '';
    
    return {
        id: index + 1,
        fullName: name,
        phone: phone,
        email: email,
        kakaoId: kakaoId || '',
        age: age,
        gender: nameData.gender === 'male' ? '남' : '여',
        region: region,
        address: generateAddress(),
        occupation: occupation,
        interests: selectedInterests.join(';'),
        tags: selectedTags.join(';'),
        notes: notes,
        isActive: Math.random() > 0.05 ? 'true' : 'false', // 95% active
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    };
}

function generateCampaign(index, tenantId = '550e8400-e29b-41d4-a716-446655440000') {
    const campaignTypes = [
        { name: '신년 인사 캠페인', title: '새해 인사', body: '{{name}}님, 새해 복 많이 받으세요!' },
        { name: '정책 설명회 안내', title: '정책 설명회', body: '{{name}}님께서 관심 있을 정책 설명회가 {{date}}에 있습니다.' },
        { name: '지역 현안 설문', title: '의견 수렴', body: '{{name}}님의 의견을 정책에 반영하고자 합니다.' },
        { name: '선거 공약 안내', title: '공약 발표', body: '{{name}}님과 약속한 공약을 실천하겠습니다.' },
        { name: '지역 행사 초대', title: '행사 초대', body: '{{name}}님을 소중한 행사에 초대합니다.' }
    ];
    
    const statuses = ['Draft', 'Queued', 'Processing', 'Sending', 'Completed', 'Failed', 'Cancelled'];
    const template = getRandomElement(campaignTypes);
    const status = getRandomElement(statuses);
    const recipients = Math.floor(Math.random() * 5000) + 100;
    const cost = (Math.random() * 1000 + 50).toFixed(2);
    
    return {
        id: `campaign-${index + 1}`,
        tenantId: tenantId,
        name: `${template.name} ${new Date().getFullYear()}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}`,
        messageTitle: template.title,
        messageBody: template.body,
        status: status,
        estimatedRecipients: recipients,
        estimatedCost: cost,
        sentCount: status === 'Completed' ? recipients : (status === 'Sending' ? Math.floor(recipients * 0.7) : 0),
        successCount: status === 'Completed' ? Math.floor(recipients * 0.95) : 0,
        failedCount: status === 'Completed' ? Math.floor(recipients * 0.05) : 0,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    };
}

async function generateTestData(options = {}) {
    const {
        contactsCount = DEFAULT_CONTACTS_COUNT,
        campaignsCount = 20,
        outputDir = OUTPUT_DIR,
        formats = ['csv', 'json']
    } = options;
    
    console.log(`🚀 Generating test data...`);
    console.log(`📊 Contacts: ${contactsCount}`);
    console.log(`📧 Campaigns: ${campaignsCount}`);
    console.log(`📁 Output directory: ${outputDir}`);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate contacts
    console.log('📝 Generating contacts...');
    const contacts = [];
    for (let i = 0; i < contactsCount; i++) {
        contacts.push(generateContact(i));
        if ((i + 1) % 1000 === 0) {
            console.log(`   Generated ${i + 1} contacts...`);
        }
    }
    
    // Generate campaigns
    console.log('📧 Generating campaigns...');
    const campaigns = [];
    for (let i = 0; i < campaignsCount; i++) {
        campaigns.push(generateCampaign(i));
    }
    
    // Export data in requested formats
    if (formats.includes('csv')) {
        console.log('💾 Writing CSV files...');
        
        // Contacts CSV
        const contactsCsvWriter = createObjectCsvWriter({
            path: path.join(outputDir, 'contacts.csv'),
            header: [
                { id: 'id', title: 'ID' },
                { id: 'fullName', title: 'Full Name' },
                { id: 'phone', title: 'Phone' },
                { id: 'email', title: 'Email' },
                { id: 'kakaoId', title: 'KakaoTalk ID' },
                { id: 'age', title: 'Age' },
                { id: 'gender', title: 'Gender' },
                { id: 'region', title: 'Region' },
                { id: 'address', title: 'Address' },
                { id: 'occupation', title: 'Occupation' },
                { id: 'interests', title: 'Interests' },
                { id: 'tags', title: 'Tags' },
                { id: 'notes', title: 'Notes' },
                { id: 'isActive', title: 'Is Active' },
                { id: 'createdAt', title: 'Created At' },
                { id: 'updatedAt', title: 'Updated At' }
            ],
            encoding: 'utf8'
        });
        
        await contactsCsvWriter.writeRecords(contacts);
        
        // Campaigns CSV
        const campaignsCsvWriter = createObjectCsvWriter({
            path: path.join(outputDir, 'campaigns.csv'),
            header: [
                { id: 'id', title: 'ID' },
                { id: 'tenantId', title: 'Tenant ID' },
                { id: 'name', title: 'Name' },
                { id: 'messageTitle', title: 'Message Title' },
                { id: 'messageBody', title: 'Message Body' },
                { id: 'status', title: 'Status' },
                { id: 'estimatedRecipients', title: 'Estimated Recipients' },
                { id: 'estimatedCost', title: 'Estimated Cost' },
                { id: 'sentCount', title: 'Sent Count' },
                { id: 'successCount', title: 'Success Count' },
                { id: 'failedCount', title: 'Failed Count' },
                { id: 'createdAt', title: 'Created At' },
                { id: 'updatedAt', title: 'Updated At' }
            ],
            encoding: 'utf8'
        });
        
        await campaignsCsvWriter.writeRecords(campaigns);
    }
    
    if (formats.includes('json')) {
        console.log('💾 Writing JSON files...');
        
        // Contacts JSON
        fs.writeFileSync(
            path.join(outputDir, 'contacts.json'),
            JSON.stringify(contacts, null, 2),
            'utf8'
        );
        
        // Campaigns JSON
        fs.writeFileSync(
            path.join(outputDir, 'campaigns.json'),
            JSON.stringify(campaigns, null, 2),
            'utf8'
        );
        
        // Combined data for import
        const combinedData = {
            metadata: {
                generated: new Date().toISOString(),
                contactsCount: contacts.length,
                campaignsCount: campaigns.length
            },
            contacts: contacts,
            campaigns: campaigns
        };
        
        fs.writeFileSync(
            path.join(outputDir, 'combined-data.json'),
            JSON.stringify(combinedData, null, 2),
            'utf8'
        );
    }
    
    console.log('✅ Test data generation completed!');
    console.log(`📁 Files created in: ${outputDir}`);
    console.log(`📊 Total contacts: ${contacts.length}`);
    console.log(`📧 Total campaigns: ${campaigns.length}`);
    
    return { contacts, campaigns };
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--contacts':
                options.contactsCount = parseInt(args[++i]) || DEFAULT_CONTACTS_COUNT;
                break;
            case '--campaigns':
                options.campaignsCount = parseInt(args[++i]) || 20;
                break;
            case '--output':
                options.outputDir = args[++i] || OUTPUT_DIR;
                break;
            case '--format':
                options.formats = args[++i].split(',') || ['csv', 'json'];
                break;
            case '--help':
                console.log(`
🏛️  Political Productivity Hub - Test Data Generator

Usage: node generate-test-data.js [options]

Options:
  --contacts <number>    Number of contacts to generate (default: ${DEFAULT_CONTACTS_COUNT})
  --campaigns <number>   Number of campaigns to generate (default: 20)
  --output <path>        Output directory (default: ${OUTPUT_DIR})
  --format <formats>     Output formats: csv,json (default: csv,json)
  --help                 Show this help message

Examples:
  node generate-test-data.js --contacts 5000 --campaigns 10
  node generate-test-data.js --output ./my-data --format csv
  node generate-test-data.js --contacts 1000 --format json
                `);
                process.exit(0);
        }
    }
    
    generateTestData(options).catch(console.error);
}

module.exports = { generateTestData, generateContact, generateCampaign };