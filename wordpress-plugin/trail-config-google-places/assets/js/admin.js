jQuery(document).ready(function($) {
    // Test API key (for settings page)
    if ($('#test-api-key').length) {
        $('#test-api-key').on('click', function() {
            var button = $(this);
            var spinner = $('#test-api-spinner');
            var result = $('#test-api-result');
            var apiKey = $('#tcgp_api_key').val();
            
            if (!apiKey) {
                result.html('<div class="notice notice-error"><p>Please enter an API key first.</p></div>');
                return;
            }
            
            button.prop('disabled', true);
            spinner.show();
            result.html('');
            
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'tcgp_test_api_key',
                    nonce: tcgp_ajax.nonce,
                    api_key: apiKey
                },
                success: function(response) {
                    if (response.success) {
                        result.html('<div class="notice notice-success"><p>' + response.data + '</p></div>');
                    } else {
                        result.html('<div class="notice notice-error"><p>' + response.data + '</p></div>');
                    }
                },
                error: function() {
                    result.html('<div class="notice notice-error"><p>API key test failed. Please check your connection.</p></div>');
                },
                complete: function() {
                    button.prop('disabled', false);
                    spinner.hide();
                }
            });
        });
    }
    
    // Reset radius button (debug only)
    if ($('#reset-radius').length) {
        $('#reset-radius').on('click', function() {
            if (confirm('This will reset the search radius to 50 meters. Continue?')) {
                var button = $(this);
                button.prop('disabled', true).text('Resetting...');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'tcgp_reset_radius',
                        nonce: tcgp_ajax.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            alert('Radius reset to 50 meters. Please refresh the page.');
                            location.reload();
                        } else {
                            alert('Failed to reset radius: ' + response.data);
                        }
                    },
                    error: function() {
                        alert('Failed to reset radius. Please try again.');
                    },
                    complete: function() {
                        button.prop('disabled', false).text('Reset Radius to 50');
                    }
                });
            }
        });
    }
}); 