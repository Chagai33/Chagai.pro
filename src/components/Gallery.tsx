import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where, updateDoc, doc, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db, getCurrentUser, checkAdminStatus, updateImageMetadata, updateSiteSettings, deleteImages } from '../lib/firebase';
import type { ImageMetadata } from '../lib/firebase';
import { LoadingSpinner } from './LoadingSpinner';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export const Gallery: React.FC = () => {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await getCurrentUser();
      if (user) {
        const adminStatus = await checkAdminStatus(user);
        setIsAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    const loadImages = async () => {
      try {
        let imagesQuery = query(
          collection(db, 'images'),
          orderBy('position', 'asc'),
          orderBy('createdAt', 'desc')
        );

        if (selectedCategory) {
          imagesQuery = query(
            collection(db, 'images'),
            where('labels', 'array-contains', selectedCategory),
            orderBy('position', 'asc'),
            orderBy('createdAt', 'desc')
          );
        }

        const querySnapshot = await getDocs(imagesQuery);
        const loadedImages = querySnapshot.docs.map((doc: QueryDocumentSnapshot, index) => ({
          id: doc.id,
          position: doc.data().position || index,
          ...doc.data()
        } as ImageMetadata));

        // Extract unique categories from labels
        const allLabels = loadedImages.reduce((acc: string[], img) => {
          return [...acc, ...img.labels];
        }, []);
        const uniqueCategories = Array.from(new Set(allLabels));
        setCategories(uniqueCategories);

        setImages(loadedImages);
        setError(null);
      } catch (err) {
        console.error('Error loading images:', err);
        setError('Failed to load images. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [selectedCategory]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !isAdmin) return;

    const reorderedImages = Array.from(images);
    const [removed] = reorderedImages.splice(result.source.index, 1);
    reorderedImages.splice(result.destination.index, 0, removed);

    // Update positions in state
    const updatedImages = reorderedImages.map((image, index) => ({
      ...image,
      position: index
    }));
    setImages(updatedImages);

    // Update positions in Firestore
    try {
      const updates = updatedImages.map((image) => 
        updateDoc(doc(db, 'images', image.id), { position: image.position })
      );
      await Promise.all(updates);
    } catch (error) {
      console.error('Failed to update image positions:', error);
      // Reload images to ensure consistency
      window.location.reload();
    }
  };

  const handleUpdate = async (imageId: string, description: string, labels: string) => {
    try {
      const updatedLabels = labels.split(',').map(label => label.trim()).filter(Boolean);
      await updateImageMetadata(imageId, { description, labels: updatedLabels });
      
      setImages(prevImages => prevImages.map(img => 
        img.id === imageId 
          ? { ...img, description, labels: updatedLabels }
          : img
      ));
      
      setEditingImage(null);
    } catch (error) {
      console.error('Failed to update image:', error);
      alert('Failed to update image. Please try again.');
    }
  };

  const handleSetAsBackground = async (imageUrl: string) => {
    try {
      await updateSiteSettings({
        loginBackgroundUrl: imageUrl
      });
      alert('Login background updated successfully');
    } catch (error) {
      console.error('Failed to update background:', error);
      alert('Failed to update background. Please try again.');
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteImages([imageId]);
      setImages(prevImages => prevImages.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedImages.size} images? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteImages(Array.from(selectedImages));
      setImages(prevImages => prevImages.filter(img => !selectedImages.has(img.id)));
      setSelectedImages(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Failed to delete images:', error);
      alert('Failed to delete images. Please try again.');
    }
  };

  const handleContact = (image: ImageMetadata) => {
    const subject = 'Image Request';
    const body = `
Hello,

I am interested in image ID: ${image.id}

Thank you!
    `.trim();
    
    window.location.href = `mailto:chagai33@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const toggleImageSelection = (imageId: string) => {
    if (!isAdmin) return;
    
    setIsSelectionMode(true);
    setSelectedImages(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId);
        if (newSelection.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        newSelection.add(imageId);
      }
      return newSelection;
    });
  };

  const preventImageDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No images found.</p>
      </div>
    );
  }

  return (
    <div>
      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              selectedCategory === null
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {isAdmin && selectedImages.size > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Delete Selected ({selectedImages.size})
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="gallery">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {images.map((image, index) => (
                <Draggable
                  key={image.id}
                  draggableId={image.id}
                  index={index}
                  isDragDisabled={!isAdmin}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`group bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 ${
                        snapshot.isDragging ? 'scale-105' : 'hover:scale-[1.02]'
                      } ${isSelectionMode && selectedImages.has(image.id) ? 'ring-2 ring-primary' : ''
                      } cursor-pointer`}
                      onClick={() => toggleImageSelection(image.id)}
                    >
                      <div className="relative">
                        <div className="relative pb-[125%]">
                          <img
                            src={image.url}
                            alt={image.description || 'Gallery image'}
                            className="absolute inset-0 w-full h-full object-cover select-none"
                            loading="lazy"
                            onContextMenu={preventImageDownload}
                            draggable="false"
                          />
                        </div>
                        {!isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContact(image);
                            }}
                            className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            title="Contact about this image"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-700">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                            </svg>
                          </button>
                        )}
                        {isAdmin && (
                          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetAsBackground(image.url);
                              }}
                              className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md"
                              title="Set as login background"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-700">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingImage(image.id);
                              }}
                              className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md"
                              title="Edit image details"
                            >
                              <PencilIcon className="w-4 h-4 text-gray-700" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(image.id);
                              }}
                              className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md"
                              title="Delete image"
                            >
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        )}
                        {isSelectionMode && (
                          <div className="absolute top-2 right-2">
                            <div className={`w-6 h-6 rounded-full border-2 ${
                              selectedImages.has(image.id)
                                ? 'bg-primary border-primary'
                                : 'border-gray-400 bg-white'
                            }`}>
                              {selectedImages.has(image.id) && (
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {editingImage === image.id ? (
                        <div className="p-4 space-y-3">
                          <textarea
                            defaultValue={image.description}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                            placeholder="Image description"
                            rows={2}
                            id={`description-${image.id}`}
                          />
                          <input
                            type="text"
                            defaultValue={image.labels.join(', ')}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                            placeholder="Labels (comma separated)"
                            id={`labels-${image.id}`}
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setEditingImage(null)}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                const description = (document.getElementById(`description-${image.id}`) as HTMLTextAreaElement).value;
                                const labels = (document.getElementById(`labels-${image.id}`) as HTMLInputElement).value;
                                handleUpdate(image.id, description, labels);
                              }}
                              className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-opacity-90"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        image.description && (
                          <div className="p-4">
                            <p className="text-gray-700">{image.description}</p>
                            {image.labels.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {image.labels.map((label, index) => (
                                  <span
                                    key={index}
                                    className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-sm"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};