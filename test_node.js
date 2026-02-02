console.log('Node is working');
try {
    const express = require('express');
    console.log('Express loaded');
} catch (e) {
    console.error('Express failed', e);
}
