import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, RotateCcw, Check } from 'lucide-react';
import { AvatarTransform } from './memberData';

interface AvatarEditorProps {
    imageUrl: string;
    initialTransform?: AvatarTransform;
    onSave: (transform: AvatarTransform) => void;
    onCancel: () => void;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ 
    imageUrl, 
    initialTransform, 
    onSave, 
    onCancel 
}) => {
    const [scale, setScale] = useState(initialTransform?.scale || 1);
    const [positionX, setPositionX] = useState(initialTransform?.positionX || 0);
    const [positionY, setPositionY] = useState(initialTransform?.positionY || 0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - positionX, y: e.clientY - positionY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const newX = Math.max(-100, Math.min(100, e.clientX - dragStart.x));
        const newY = Math.max(-100, Math.min(100, e.clientY - dragStart.y));
        setPositionX(newX);
        setPositionY(newY);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - positionX, y: touch.clientY - positionY });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const newX = Math.max(-100, Math.min(100, touch.clientX - dragStart.x));
        const newY = Math.max(-100, Math.min(100, touch.clientY - dragStart.y));
        setPositionX(newX);
        setPositionY(newY);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(3, prev + 0.1));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(0.5, prev - 0.1));
    };

    const handleReset = () => {
        setScale(1);
        setPositionX(0);
        setPositionY(0);
    };

    const handleSave = () => {
        onSave({ scale, positionX, positionY });
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchend', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchend', handleGlobalMouseUp);
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Adjust Profile Photo</h3>
                    <button 
                        onClick={onCancel}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Preview Area */}
                    <div className="flex justify-center mb-6">
                        <div 
                            ref={containerRef}
                            className="w-48 h-48 rounded-full overflow-hidden border-4 border-gray-200 cursor-move relative bg-white"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            <img 
                                src={imageUrl} 
                                alt="Avatar preview"
                                className="absolute inset-0 w-full h-full select-none"
                                style={{
                                    objectFit: 'contain',
                                    transform: `scale(${scale}) translate(${positionX}px, ${positionY}px)`,
                                    transformOrigin: 'center center',
                                }}
                                draggable={false}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                                <Move className="h-8 w-8 text-gray-600" />
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <p className="text-sm text-gray-500 text-center mb-4">
                        Drag to reposition • Use controls to zoom
                    </p>

                    {/* Zoom Controls */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <button
                            onClick={handleZoomOut}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut className="h-5 w-5 text-gray-600" />
                        </button>
                        
                        <div className="flex-1 max-w-32">
                            <input
                                type="range"
                                min="50"
                                max="300"
                                value={scale * 100}
                                onChange={(e) => setScale(parseInt(e.target.value) / 100)}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                        </div>
                        
                        <button
                            onClick={handleZoomIn}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>

                    {/* Zoom Percentage */}
                    <p className="text-center text-sm text-gray-500 mb-4">
                        {Math.round(scale * 100)}%
                    </p>

                    {/* Position Sliders */}
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 w-20">Horizontal</span>
                            <input
                                type="range"
                                min="-100"
                                max="100"
                                value={positionX}
                                onChange={(e) => setPositionX(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 w-20">Vertical</span>
                            <input
                                type="range"
                                min="-100"
                                max="100"
                                value={positionY}
                                onChange={(e) => setPositionY(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t bg-gray-50 flex justify-between">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvatarEditor;

// Helper component to display avatar with transform applied
export const TransformedAvatar: React.FC<{
    src: string;
    transform?: AvatarTransform;
    className?: string;
    alt?: string;
    onClick?: () => void;
}> = ({ src, transform, className = '', alt = 'Avatar', onClick }) => {
    const [imgError, setImgError] = React.useState(false);
    
    const style = transform ? {
        transform: `scale(${transform.scale}) translate(${transform.positionX}px, ${transform.positionY}px)`,
        transformOrigin: 'center center',
    } : {};

    // Generate initials from alt text for fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Generate a consistent color based on the name
    const getColor = (name: string) => {
        const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
            'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-500'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    if (imgError || !src) {
        return (
            <div 
                className={`${className} ${getColor(alt)} flex items-center justify-center text-white font-semibold ${onClick ? 'cursor-pointer' : ''}`}
                onClick={onClick}
            >
                {getInitials(alt)}
            </div>
        );
    }

    return (
        <div 
            className={`overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''} relative bg-gray-100`}
            onClick={onClick}
        >
            <img 
                src={src} 
                alt={alt}
                className="absolute inset-0 w-full h-full"
                style={{
                    objectFit: transform ? 'contain' : 'cover',
                    ...style
                }}
                onError={() => setImgError(true)}
            />
        </div>
    );
};
