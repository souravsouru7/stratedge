require('dotenv').config();
console.log('MONGO_URI from process.env:', process.env.MONGO_URI);
if (process.env.MONGO_URI.startsWith('mongodb+srv')) {
    console.error('ERROR: Still using SRV string!');
} else {
    console.log('Using standard string correctly.');
}
