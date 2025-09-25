function toggleFields() {
    var role = document.getElementById('role').value;
    var schoolGroup = document.getElementById('school-group');
    var orgGroup = document.getElementById('org-group');
    if (role === 'student') {
        schoolGroup.style.display = 'block';
        document.getElementById('school').required = true;
        orgGroup.style.display = 'none';
        document.getElementById('organization').required = false;
    } else if (role === 'organizer') {
        orgGroup.style.display = 'block';
        document.getElementById('organization').required = true;
        schoolGroup.style.display = 'none';
        document.getElementById('school').required = false;
    } else {
        schoolGroup.style.display = 'none';
        orgGroup.style.display = 'none';
        document.getElementById('school').required = false;
        document.getElementById('organization').required = false;
    }
}

// Make the function available globally
window.toggleFields = toggleFields;
