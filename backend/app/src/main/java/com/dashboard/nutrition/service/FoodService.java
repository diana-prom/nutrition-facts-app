package com.dashboard.nutrition.service;

import com.dashboard.nutrition.dto.FoodDTO;
import com.dashboard.nutrition.entity.Food;
import com.dashboard.nutrition.entity.FoodCalorieConversionFactor;
import com.dashboard.nutrition.exception.ResourceNotFoundException;
import com.dashboard.nutrition.mapper.FoodMapper;
import com.dashboard.nutrition.repository.FoodRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;


@Service
@Transactional
public class FoodService {

    private final FoodRepository foodRepository;
    private final FoodMapper foodMapper;

    public FoodService(FoodRepository foodRepository, FoodMapper foodMapper) {
        this.foodRepository = foodRepository;
        this.foodMapper = foodMapper;
    }

    /**
     * Get all foods as DTOs
     */
    public List<FoodDTO> getAllFoods() {
        return foodRepository.findAll()
                .stream()
                .map(foodMapper::toDTO) //.map(food -> foodMapper.toDTO(food))
                .collect(Collectors.toList());
    }

    /**
     * Get a single food by ID
     */
    public FoodDTO getFoodById(Integer fdcId) {
        return foodRepository.findById(fdcId)
                .map(foodMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Food not found with fdcId " + fdcId
                ));
    }

    /**
     * Search foods by multiple words (all words must match)
     **/
    public List<Food> searchByDescriptionWords(String name) {
        String[] words = name.toLowerCase().split("\\s+");
        return foodRepository.findAll().stream()
                .filter(f -> Arrays.stream(words)
                        .allMatch(w -> f.getDescription().toLowerCase().contains(w))
                )
                .collect(Collectors.toList());
    }

    /**
     * Search by description and return the "best" row:
     * - Prioritizes rows where protein, fat, and carbohydrate are all non-null
     * - Fallback to first row with at least one macro
     * - Throws ResourceNotFoundException if no valid food found
     */

    public FoodDTO searchBestByDescription(String description) {
        List<Food> foods = searchByDescriptionWords(description);


        return foods.stream()
                .flatMap(food -> food.getNutrientConversionFactors().stream())
                .filter(n -> n.getCalorieConversionFactor() != null)
                // Pick the row with most macros present
                .max(Comparator.comparingInt(n -> {
                    FoodCalorieConversionFactor c = n.getCalorieConversionFactor();
                    int count = 0;
                    if (c.getProteinValue() != null) count++;
                    if (c.getFatValue() != null) count++;
                    if (c.getCarbohydrateValue() != null) count++;
                    return count; //higher count = better
                }))
                .map(n -> foodMapper.toDTO(n.getFood()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No nutrition information found for: " + description
                ));
    }
}

