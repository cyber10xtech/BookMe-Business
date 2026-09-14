const fs = require('fs');

// Fix AttendanceConfirmationModal.tsx
let modalCode = fs.readFileSync('src/components/AttendanceConfirmationModal.tsx', 'utf8');
modalCode = modalCode.replace(/catch \(err: any\) \{/g, 'catch (err: unknown) {\\n      const error = err as Error;');
modalCode = modalCode.replace(/toast\.error\(err\.message \|\|/g, 'toast.error(error.message ||');
fs.writeFileSync('src/components/AttendanceConfirmationModal.tsx', modalCode);

console.log('Fixed Business app');
