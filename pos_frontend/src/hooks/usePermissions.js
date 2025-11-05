import { useSelector } from 'react-redux';

/**
 * Custom hook for checking user permissions
 * @returns {Object} Permission checking utilities
 */
const usePermissions = () => {
    const user = useSelector((state) => state.user.user);

    /**
     * Check if user has a specific permission
     * @param {number} permissionId - The permission ID to check for
     * @returns {boolean} True if user has the permission
     */
    const hasPermission = (permissionId) => {
        return user?.permissions && user.permissions.includes(permissionId);
    };

    /**
     * Check if user can access pay rate related features
     * @returns {boolean} True if user can access pay rates
     */
    const canAccessPayRates = () => {
        return user?.is_superuser || hasPermission(3);
    };


    return {
        // Permission checking
        hasPermission,
        canAccessPayRates,
    };
};

export default usePermissions;
